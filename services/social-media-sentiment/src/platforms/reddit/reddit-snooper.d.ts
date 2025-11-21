declare module "reddit-snooper" {
  export default class Snooper {
    constructor(config: any);
    snooper(config: any): any;
    get_subreddit(subreddit: string): Promise<any>;
    get_user(username: string): Promise<any>;
    get_comments(postId: string): Promise<any[]>;
    search(params: any): Promise<any>;
    get_front_page(params?: any): Promise<any>;
  }
}
