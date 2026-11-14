import type { CapacitorConfig } from "@capacitor/cli";

const config:CapacitorConfig={
 appId:"com.codemjd.sparkworkshop",
 appName:"ورشة الشرارات",
 webDir:"dist",
 server:{androidScheme:"https"},
 android:{allowMixedContent:false}
};
export default config;
