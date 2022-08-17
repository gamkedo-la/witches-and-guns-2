export function pointInRectangle(point, rectangle) {
  return point.x > rectangle.x && point.y > rectangle.y && point.x < rectangle.x + rectangle.width && point.y < rectangle.y + rectangle.height;
}
