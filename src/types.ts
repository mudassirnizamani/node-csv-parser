export type ContactData = {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: number;
  tags?: string[];
};

export type ResultData = {
  imported: number;
  updated: number;
  skipped: number;
  errors: Array<any>;
  contactsData: Array<ContactData>;
};

export type FileHeaders = {
  first_name: number | null;
  last_name: number | null;
  phone_number: number | null;
  email: number | null;
};
