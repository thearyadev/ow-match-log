from paddleocr import PaddleOCR
from paddleocr.ppocr.utils.logging import get_logger
import sys
from dataclasses import dataclass
from typing import Final
import logging
import warnings

warnings.filterwarnings("ignore", category=UserWarning, module='paddle.utils.cpp_extension.extension_utils')

[_, imagePath, *otherArgs] = sys.argv

flattenPadding: Final = 0
logger = get_logger()
logger.setLevel(logging.ERROR)


@dataclass
class Point:
    x: float
    y: float


@dataclass
class Box:
    topLeft: Point
    bottomLeft: Point
    bottomRight: Point
    topRight: Point


@dataclass
class Detection:
    box: Box
    label: str

    def getYRange(self):
        return (
            self.box.topLeft.y - flattenPadding,
            self.box.bottomRight.y + flattenPadding,
        )


def get_ocr(imagePath):
    ocr = PaddleOCR(lang="ch", show_log=True)
    result = ocr.ocr(
        img=imagePath,
        det=True,
        rec=True,
        cls=False,
        bin=False,
        inv=False,
        alpha_color=(255, 255, 255),
    )
    return [
        Detection(
            Box(
                Point(line[0][0][0], line[0][0][1]),
                Point(line[0][1][0], line[0][1][1]),
                Point(line[0][2][0], line[0][2][1]),
                Point(line[0][3][0], line[0][3][1]),
            ),
            line[1][0],
        )
        for line in result[0]
    ]

def flatten_intervals(intervals):
    if not intervals:
        return []
    intervals.sort(key=lambda x: x[0])
    merged = [intervals[0]]
    for current in intervals[1:]:
        previous = merged[-1]
        if current[0] <= previous[1]:
            # If the start of the current interval is within or equal to the end of the previous, extend the interval
            merged[-1] = (previous[0], max(previous[1], current[1]))
        else:
            # If there's no overlap, just append the current interval
            merged.append(current)
    return merged


def group_y_ranges(detections: list[Detection]):
    ranges = [d.getYRange() for d in detections]
    merged_ranges = flatten_intervals(ranges)
    groups: dict[tuple[float, float], list[Detection]] = {r: [] for r in merged_ranges}
    for detection in detections:
        y_range = detection.getYRange()
        for group_range in merged_ranges:
            if group_range[0] <= y_range[1] and group_range[1] >= y_range[0]:
                groups[group_range].append(detection)
                break
    return {k: v for k, v in groups.items() if v}

def dump_stduout(detections:  dict[tuple[float, float], list[Detection]]):
    for group in detections.values():
        print(" ".join([d.label for d in group]))


def main() -> int:
    if (otherArgs):
        PaddleOCR(lang='ch')
        return 0
    result = get_ocr(imagePath)
    grouped = group_y_ranges(result)
    dump_stduout(grouped)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
