export interface ThreadsTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

export interface ThreadsUserData {
  id: string;
  username: string;
  name?: string;
  threads_profile_picture_url?: string;
  threads_biography?: string;
  error?: {
    message: string;
    code?: number;
  };
}

export interface ThreadsAuthState {
  isLoading: boolean;
  user: ThreadsUserData | null;
  accessToken: string | null;
  error: string | null;
}
