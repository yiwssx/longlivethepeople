export type MessageRecord = {
  id: string;
  codename: string;
  affiliation: string;
  message: string;
  createdAt: string;
};

export type MessagePayload = Pick<MessageRecord, 'codename' | 'affiliation' | 'message'>;

export type MessagePage = {
  data: MessageRecord[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
  };
};
