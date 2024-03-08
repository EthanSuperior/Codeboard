import sys
from PIL import Image

def get_matrix_from_image(image_path):
    image = Image.open(image_path)
    width, height = image.size
    matrix = [[0 for x in range(width)] for y in range(height)]
    for y in range(height):
        for x in range(width):
            pixel = image.getpixel((x, y))[0]
            if pixel != 0:
                matrix[y][x] = 1
    return matrix

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python3 ImageToMatrix.py <image_path>")
        sys.exit(1)
    image_path = sys.argv[1]
    matrix = get_matrix_from_image(image_path)
    for row in matrix:
        print(row)
