export type MessageLimits = Readonly<{
  codenameMaxLength: number;
  affiliationMaxLength: number;
  messageMaxLength: number;
}>;

const messageLimits: MessageLimits = Object.freeze({
  codenameMaxLength: 80,
  affiliationMaxLength: 120,
  messageMaxLength: 2000,
});

export default messageLimits;
