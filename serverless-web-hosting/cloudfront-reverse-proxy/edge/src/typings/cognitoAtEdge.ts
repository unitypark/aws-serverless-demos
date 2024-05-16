export type AuthenticatorLogLevel =
  | "fatal"
  | "error"
  | "warn"
  | "info"
  | "debug"
  | "trace"
  | "silent";

export enum Region {
  DEFAULT = "eu-west-1",
  EDGE = "us-east-1",
}
