#!/usr/bin/env python3
"""Pad Yellow Jelly PNG to square (199x199) by adding a bottom row of background pixels."""
import struct
import zlib

def main():
    src = '/Users/immortalcourt/Downloads/Yellow Jelly.png'
    dst = '/Users/immortalcourt/the-infinite-corridor/icons/app-icon-square.png'

    with open(src, 'rb') as f:
        data = f.read()

    # Parse PNG chunks
    pos = 8
    ihdr = None
    idat = b''
    while pos < len(data):
        length = struct.unpack('>I', data[pos:pos+4])[0]
        chunk_type = data[pos+4:pos+8]
        chunk_data = data[pos+8:pos+8+length]
        pos += 12 + length
        if chunk_type == b'IHDR':
            ihdr = chunk_data
        elif chunk_type == b'IDAT':
            idat += chunk_data

    w, h = struct.unpack('>II', ihdr[:8])
    bit_depth, color_type = struct.unpack('>BB', ihdr[8:10])
    bytes_per_pixel = 4  # RGBA for color_type=6
    scanline_stride = 1 + w * bytes_per_pixel  # filter byte + pixel row

    print(f'Source: {w}x{h}, bit_depth={bit_depth}, color_type={color_type}')
    print(f'Scanline stride: {scanline_stride} bytes')

    raw = zlib.decompress(idat)
    print(f'Decompressed raw size: {len(raw)} bytes (expected {h * scanline_stride})')

    # Sample the bottom non-transparent row to get background color
    # Find a row that has non-zero alpha near the bottom
    bg_r, bg_g, bg_b, bg_a = 0, 0, 0, 0
    for row_y in range(h - 1, max(h - 10, 0), -1):
        row_start = row_y * scanline_stride
        row = raw[row_start:row_start + scanline_stride]
        # Skip filter byte, check pixels
        for px in range(min(w, 10)):  # check first 10 pixels
            pixel = row[1 + px * bytes_per_pixel:1 + px * bytes_per_pixel + bytes_per_pixel]
            r, g, b, a = struct.unpack('>BBBB', pixel)
            if a > 0:
                bg_r, bg_g, bg_b = r, g, b
                bg_a = a
                print(f'Background from y={row_y}, x={px}: RGBA({r},{g},{b},{a})')
                break
        if bg_a > 0:
            break

    if bg_a == 0:
        # Fallback: sample from visible area at bottom
        # Check the second-to-last row fully
        for row_y in range(h - 1, -1, -1):
            row_start = row_y * scanline_stride
            for px in range(w):
                pixel = row[1 + px * bytes_per_pixel:1 + px * bytes_per_pixel + bytes_per_pixel]
                r, g, b, a = struct.unpack('>BBBB', pixel)
                if a > 0:
                    bg_r, bg_g, bg_b, bg_a = r, g, b, a
                    break
            if bg_a > 0:
                break

    print(f'Using background: RGBA({bg_r},{bg_g},{bg_b},{bg_a})')

    # Pad: add (w - h) rows at the bottom to make it square
    pad_rows = w - h
    pad_row = bytes([0] + [bg_r, bg_g, bg_b, bg_a] * w)  # filter type 0 + row pixels
    pad_data = pad_row * pad_rows

    new_raw = raw + pad_data
    new_h = h + pad_rows

    def chunk(chunk_type, data):
        crc = zlib.crc32(chunk_type + data) & 0xffffffff
        return struct.pack('>I', len(data)) + chunk_type + data + struct.pack('>I', crc)

    ihdr_data = struct.pack('>II', w, new_h) + struct.pack('>BBBBB', bit_depth, color_type, 0, 0, 0)
    compressed = zlib.compress(new_raw)
    signature = b'\x89PNG\r\n\x1a\n'

    with open(dst, 'wb') as f:
        f.write(signature)
        f.write(chunk(b'IHDR', ihdr_data))
        f.write(chunk(b'IDAT', compressed))
        f.write(chunk(b'IEND', b''))

    print(f'Written square: {w}x{new_h} -> {dst}')
    print(f'New file size: {open(dst, "rb").seek(0, 2)} bytes')

if __name__ == '__main__':
    main()
