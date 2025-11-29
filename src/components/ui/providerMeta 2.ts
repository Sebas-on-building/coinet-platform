export interface ProviderMeta {
  logo: string;
  color: string;
  scopes: { [scope: string]: string };
}

export const providerMeta: { [provider: string]: ProviderMeta } = {
  google: {
    logo: "/logos/google.svg",
    color: "#4285F4",
    scopes: {
      openid: "Authenticate with your Google account",
      email: "Access your email address",
      profile: "Access your basic profile info",
      "https://www.googleapis.com/auth/admin.directory.user":
        "Admin directory access",
      "https://www.googleapis.com/auth/user.birthday.read":
        "Read your birthday",
    },
  },
  apple: {
    logo: "/logos/apple.svg",
    color: "#000000",
    scopes: {
      name: "Access your name",
      email: "Access your email address",
    },
  },
  twitter: {
    logo: "/logos/twitter.svg",
    color: "#1DA1F2",
    scopes: {
      "tweet.read": "Read your tweets",
      "users.read": "Read your profile info",
      email: "Access your email address",
      "offline.access": "Access when you are offline",
    },
  },
  github: {
    logo: "/logos/github.svg",
    color: "#333333",
    scopes: {
      "read:user": "Read your GitHub profile",
      "user:email": "Access your email address",
      "admin:org": "Administer organizations",
    },
  },
  discord: {
    logo: "/logos/discord.svg",
    color: "#5865F2",
    scopes: {
      identify: "Access your Discord username and avatar",
      email: "Access your email address",
    },
  },
  linkedin: {
    logo: "/logos/linkedin.svg",
    color: "#0077B5",
    scopes: {
      r_liteprofile: "Access your basic LinkedIn profile",
      r_emailaddress: "Access your email address",
    },
  },
};
