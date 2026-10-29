/**
 * Minimal deterministic PDF writer for the S1 contract (no dependencies).
 * @react-pdf/renderer breaks under Next.js dev bundling (dual-React
 * reconciler split, React #31) — this writer is plain text assembly and
 * behaves identically in dev, prod and tests. Text-only: drawn signature
 * PNGs stay in the DB row; the PDF records typed names + timestamps.
 */

function esc(s: string): string {
  // WinAnsi-safe: fold common accents, drop the rest, escape PDF delimiters.
  const folded = s
    .replace(/[áàäâ]/g, "a").replace(/[éèëê]/g, "e").replace(/[íìïî]/g, "i")
    .replace(/[óòöô]/g, "o").replace(/[úùüû]/g, "u").replace(/[ñ]/g, "n")
    .replace(/[ÁÀÄÂ]/g, "A").replace(/[ÉÈËÊ]/g, "E").replace(/[ÍÌÏÎ]/g, "I")
    .replace(/[ÓÒÖÔ]/g, "O").replace(/[ÚÙÜÛ]/g, "U").replace(/[Ñ]/g, "N")
    .replace(/[""]/g, '"').replace(/['']/g, "'").replace(/[—–]/g, "-");
  return folded.replace(/[\x00-\x1f\x7f-\uffff]/g, "?").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export interface PdfSignature {
  role: string;
  signerName: string;
  email: string;
  signedAt: number;
}

export function makeContractPdf(args: {
  title: string;
  body: string;
  signatures: PdfSignature[];
  footer: string;
}): Uint8Array {
  const lines: string[] = [args.title, ""];
  for (const raw of args.body.split("\n")) {
    let line = raw;
    while (line.length > 95) {
      lines.push(line.slice(0, 95));
      line = line.slice(95);
    }
    lines.push(line);
  }
  lines.push("", "Signatures / Firmas:");
  for (const s of args.signatures) {
    lines.push(`${s.role}: ${s.signerName} <${s.email}> — ${new Date(s.signedAt).toISOString()}`);
  }
  lines.push("", args.footer);

  const perPage = 45;
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += perPage) pages.push(lines.slice(i, i + perPage));

  const objects: string[] = [];
  const pageIds: number[] = [];
  // 1: catalog, 2: pages, then per page: page + content, last: font
  let nextId = 3;
  const contentIds: { page: number; content: number }[] = [];
  for (let i = 0; i < pages.length; i++) {
    contentIds.push({ page: nextId, content: nextId + 1 });
    pageIds.push(nextId);
    nextId += 2;
  }
  const fontId = nextId;

  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj");
  objects.push(`2 0 obj\n<< /Type /Pages /Kids [${pageIds.map((n) => `${n} 0 R`).join(" ")}] /Count ${pages.length} >>\nendobj`);

  const enc = new TextEncoder();
  const streams: Uint8Array[] = [];
  pages.forEach((ls, i) => {
    let y = 800;
    let ops = "";
    for (const line of ls) {
      ops += `BT /F1 11 Tf 50 ${y} Td (${esc(line)}) Tj ET\n`;
      y -= 16;
    }
    const bytes = enc.encode(ops);
    streams.push(bytes);
    const { page, content } = contentIds[i];
    objects.push(`${page} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents ${content} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>\nendobj`);
    // Content-stream bytes are spliced in during assembly (the tail is added there too).
    objects.push(`${content} 0 obj\n<< /Length ${bytes.length} >>\nstream\n`);
  });
  objects.push(`${fontId} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj`);

  // Assemble with correct byte offsets.
  const header = enc.encode("%PDF-1.4\n");
  const parts: Uint8Array[] = [header];
  const offsets: number[] = [];
  let pos = header.length;
  let streamIx = 0;
  for (const obj of objects) {
    if (obj.endsWith("stream\n")) {
      const head = enc.encode(obj);
      offsets.push(pos);
      parts.push(head);
      pos += head.length;
      parts.push(streams[streamIx]);
      pos += streams[streamIx].length;
      streamIx += 1;
      const tail = enc.encode("\nendstream\nendobj\n");
      parts.push(tail);
      pos += tail.length;
    } else {
      const b = enc.encode(obj + "\n");
      offsets.push(pos);
      parts.push(b);
      pos += b.length;
    }
  }
  const xrefPos = pos;
  let xref = `xref\n0 ${offsets.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) xref += `${String(o).padStart(10, "0")} 00000 n \n`;
  xref += `trailer\n<< /Size ${offsets.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  parts.push(enc.encode(xref));

  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}
