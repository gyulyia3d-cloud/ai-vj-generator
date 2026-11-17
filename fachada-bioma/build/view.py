import sys
from PIL import Image
f=sys.argv[1]; out=sys.argv[2]
im=Image.open(f); W,H=im.size; n=H//1520
fr=[im.crop((0,i*1520,W,(i+1)*1520)).resize((560,443)) for i in range(n)]
cols=3; rows=(n+cols-1)//cols
sheet=Image.new('RGB',(560*cols,443*rows))
for i,x in enumerate(fr): sheet.paste(x,((i%cols)*560,(i//cols)*443))
sheet.save(out)
