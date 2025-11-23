import zxcvbn from "zxcvbn";

// A small sample; in production, use a much larger list (10,000+)
const commonPasswords = [
  "123456",
  "password",
  "123456789",
  "12345678",
  "12345",
  "111111",
  "1234567",
  "sunshine",
  "qwerty",
  "iloveyou",
  "princess",
  "admin",
  "welcome",
  "666666",
  "abc123",
  "football",
  "123123",
  "monkey",
  "654321",
  "!@#$%^&*",
  "charlie",
  "aa123456",
  "donald",
  "password1",
  "qwerty123",
];

export function checkPasswordEntropy(
  password: string,
  minScore: number = 3,
): boolean {
  // zxcvbn returns score 0-4; 3 is "safely unguessable"
  const { score } = zxcvbn(password);
  return score >= minScore;
}

export function isCommonPassword(password: string): boolean {
  return commonPasswords.includes(password.toLowerCase());
}
