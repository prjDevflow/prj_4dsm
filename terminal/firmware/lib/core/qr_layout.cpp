#include "qr_layout.h"

QrLayout layoutQr(int areaPx, int modules) {
  if (areaPx <= 0 || modules <= 0) return QrLayout{0, 0};
  const int modulePx = areaPx / modules;
  return QrLayout{modulePx, (areaPx - modules * modulePx) / 2};
}
