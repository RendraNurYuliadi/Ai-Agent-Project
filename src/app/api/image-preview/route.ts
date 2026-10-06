import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import https, { type RequestOptions } from "node:https";
import type { IncomingMessage } from "node:http";
import ipaddr from "ipaddr.js";
import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function isPublicAddress(address: string): boolean {
  try {
    return ipaddr.process(address).range() === "unicast";
  } catch {
    return false;
  }
}

async function resolvePublicAddress(url: URL) {
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const literalFamily = isIP(hostname);
  const addresses = literalFamily
    ? [{ address: hostname, family: literalFamily }]
    : await lookup(hostname, { all: true, verbatim: true });

  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new Error("Image host must resolve to public IP addresses.");
  }

  return addresses[0];
}

function requestImage(url: URL, address: { address: string; family: number }): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    const requestOptions: RequestOptions = {
      agent: false,
      headers: {
        Accept: "image/avif,image/webp,image/png,image/jpeg,image/gif",
        "User-Agent": "GenAI-Chatbot-Image-Preview/1.0",
      },
      lookup: (_hostname, options, callback) => {
        if (options.all) {
          callback(null, [address]);
        } else {
          callback(null, address.address, address.family);
        }
      },
    };
    const request = https.request(url, requestOptions, resolve);
    request.setTimeout(10_000, () => request.destroy(new Error("Image request timed out.")));
    request.on("error", reject);
    request.end();
  });
}

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const source = req.nextUrl.searchParams.get("url") || "";
  if (!source || source.length > 2048) {
    return NextResponse.json({ error: "URL gambar tidak valid." }, { status: 400 });
  }

  try {
    let target = new URL(source);
    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
      if (target.protocol !== "https:" || target.username || target.password || target.port) {
        return NextResponse.json({ error: "URL gambar HTTPS tidak valid." }, { status: 400 });
      }

      const address = await resolvePublicAddress(target);
      const response = await requestImage(target, address);
      const status = response.statusCode || 502;

      if (status >= 300 && status < 400) {
        const location = response.headers.location;
        response.resume();
        if (!location || redirects === MAX_REDIRECTS) {
          return NextResponse.json({ error: "Redirect gambar terlalu banyak." }, { status: 502 });
        }
        target = new URL(location, target);
        continue;
      }

      if (status < 200 || status >= 300) {
        response.resume();
        return NextResponse.json({ error: "Gambar tidak dapat diambil." }, { status: 502 });
      }

      const contentType = String(response.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
      if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
        response.resume();
        return NextResponse.json({ error: "Format gambar tidak didukung." }, { status: 415 });
      }

      const contentLength = Number(response.headers["content-length"]);
      if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_BYTES) {
        response.destroy();
        return NextResponse.json({ error: "Ukuran gambar melebihi 5 MB." }, { status: 413 });
      }

      const chunks: Buffer[] = [];
      let totalBytes = 0;
      for await (const chunk of response) {
        const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        totalBytes += bytes.length;
        if (totalBytes > MAX_IMAGE_BYTES) {
          response.destroy();
          return NextResponse.json({ error: "Ukuran gambar melebihi 5 MB." }, { status: 413 });
        }
        chunks.push(bytes);
      }

      return new Response(new Uint8Array(Buffer.concat(chunks)), {
        headers: {
          "Cache-Control": "private, max-age=300",
          "Content-Type": contentType,
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
  } catch {
    return NextResponse.json({ error: "Gagal memuat gambar." }, { status: 502 });
  }

  return NextResponse.json({ error: "Redirect gambar terlalu banyak." }, { status: 502 });
}