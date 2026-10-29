from pathlib import Path
import zlib,struct
p=Path('public/icons');p.mkdir(parents=True,exist_ok=True)
def chunk(t,d):return struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
for size in [192,512]:
 raw=bytearray()
 for y in range(size):
  raw.append(0)
  for x in range(size):
   nx=x/size;ny=y/size
   line=(abs(ny-(.40+abs(nx-.36)*1.18))<.016 and .2<nx<.53) or (abs(ny-(.40+abs(nx-.62)*1.18))<.016 and .47<nx<.8)
   ring=abs(((nx-.5)**2+(ny-.5)**2)**.5-.36)<.008
   raw.extend((198,161,91) if line or ring else (18,60,53))
 data=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',size,size,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(bytes(raw)))+chunk(b'IEND',b'')
 p.joinpath(f'icon-{size}.png').write_bytes(data)
 if size==512:p.joinpath('maskable-512.png').write_bytes(data)
