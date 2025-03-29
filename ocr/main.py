from paddleocr import PaddleOCR
from rich import print
import sys

[_, imagePath, *_] = sys.argv

def get_ocr(imagePath):
    ocr = PaddleOCR()
    result = ocr.ocr(
        img=imagePath,
        det=True,
        rec=True,
        cls=False,
        bin=False, 
        inv=False, 
        alpha_color=(255, 255, 255),
    )
    return result

def dump_result(result):
    for i in result:
        for j in i:
            print(j[1][0])


def main() -> int:
    result = get_ocr(imagePath)
    dump_result(result)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
