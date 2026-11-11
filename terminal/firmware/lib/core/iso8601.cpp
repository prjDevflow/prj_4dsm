#include "iso8601.h"

namespace {
bool readDigits(const char*& p, int count, int& value) {
  value = 0;
  for (int i = 0; i < count; ++i) {
    if (p[i] < '0' || p[i] > '9') return false;
    value = value * 10 + (p[i] - '0');
  }
  p += count;
  return true;
}

bool expect(const char*& p, char c) {
  if (*p != c) return false;
  ++p;
  return true;
}

bool isLeapYear(int year) { return (year % 4 == 0 && year % 100 != 0) || year % 400 == 0; }

int daysInMonth(int year, int month) {
  static const int kDays[] = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
  return month == 2 && isLeapYear(year) ? 29 : kDays[month - 1];
}

// Days from 1970-01-01 to a civil date (Howard Hinnant's days_from_civil).
int64_t daysFromCivil(int year, int month, int day) {
  if (month <= 2) --year;
  const int era = (year >= 0 ? year : year - 399) / 400;
  const int yearOfEra = year - era * 400;
  const int dayOfYear = (153 * (month > 2 ? month - 3 : month + 9) + 2) / 5 + day - 1;
  const int dayOfEra = yearOfEra * 365 + yearOfEra / 4 - yearOfEra / 100 + dayOfYear;
  return static_cast<int64_t>(era) * 146097 + dayOfEra - 719468;
}

// Civil date of a day count from 1970-01-01 (Howard Hinnant's civil_from_days).
void civilFromDays(int64_t days, int& year, int& month, int& day) {
  days += 719468;
  const int64_t era = (days >= 0 ? days : days - 146096) / 146097;
  const int64_t dayOfEra = days - era * 146097;
  const int64_t yearOfEra = (dayOfEra - dayOfEra / 1460 + dayOfEra / 36524 - dayOfEra / 146096) / 365;
  const int64_t dayOfYear = dayOfEra - (365 * yearOfEra + yearOfEra / 4 - yearOfEra / 100);
  const int64_t monthIndex = (5 * dayOfYear + 2) / 153;
  day = static_cast<int>(dayOfYear - (153 * monthIndex + 2) / 5 + 1);
  month = static_cast<int>(monthIndex < 10 ? monthIndex + 3 : monthIndex - 9);
  year = static_cast<int>(yearOfEra + era * 400 + (month <= 2 ? 1 : 0));
}

void putDigits(char* out, int value, int width) {
  for (int i = width - 1; i >= 0; --i) {
    out[i] = static_cast<char>('0' + value % 10);
    value /= 10;
  }
}
}  // namespace

bool formatIsoUtc(int64_t epochMs, char* out, size_t outSize) {
  if (out == nullptr || outSize == 0) return false;
  out[0] = '\0';
  if (outSize < kIsoUtcLength + 1) return false;

  int64_t seconds = epochMs / 1000;
  if (epochMs % 1000 < 0) --seconds;  // floor, also before 1970
  int64_t days = seconds / 86400;
  int64_t secondOfDay = seconds % 86400;
  if (secondOfDay < 0) {
    secondOfDay += 86400;
    --days;
  }
  int year = 0, month = 0, day = 0;
  civilFromDays(days, year, month, day);
  if (year < 0 || year > 9999) return false;

  // "YYYY-MM-DDTHH:MM:SSZ"
  putDigits(out, year, 4);
  out[4] = '-';
  putDigits(out + 5, month, 2);
  out[7] = '-';
  putDigits(out + 8, day, 2);
  out[10] = 'T';
  putDigits(out + 11, static_cast<int>(secondOfDay / 3600), 2);
  out[13] = ':';
  putDigits(out + 14, static_cast<int>(secondOfDay / 60 % 60), 2);
  out[16] = ':';
  putDigits(out + 17, static_cast<int>(secondOfDay % 60), 2);
  out[19] = 'Z';
  out[20] = '\0';
  return true;
}

bool parseIsoUtcMs(const char* text, int64_t& epochMs) {
  if (text == nullptr) return false;
  const char* p = text;
  int year = 0, month = 0, day = 0, hour = 0, minute = 0, second = 0;
  if (!readDigits(p, 4, year) || !expect(p, '-') || !readDigits(p, 2, month) || !expect(p, '-') ||
      !readDigits(p, 2, day) || !expect(p, 'T') || !readDigits(p, 2, hour) || !expect(p, ':') ||
      !readDigits(p, 2, minute) || !expect(p, ':') || !readDigits(p, 2, second)) {
    return false;
  }

  int millis = 0;
  if (*p == '.') {
    ++p;
    int digits = 0;
    for (; *p >= '0' && *p <= '9'; ++p, ++digits) {
      if (digits < 3) millis = millis * 10 + (*p - '0');  // beyond milliseconds is ignored
    }
    if (digits == 0) return false;
    for (int i = digits; i < 3; ++i) millis *= 10;  // ".5" is 500 ms
  }
  if (*p != 'Z' || p[1] != '\0') return false;

  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month) || hour > 23 || minute > 59 ||
      second > 59) {
    return false;
  }
  const int64_t seconds = ((daysFromCivil(year, month, day) * 24 + hour) * 60 + minute) * 60 + second;
  epochMs = seconds * 1000 + millis;
  return true;
}
