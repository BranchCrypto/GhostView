// GhostView - DNS服务器配置

// DNS服务器列表
window.DNS_SERVERS = [
  {
    id: "system",
    name: "系统默认",
    servers: [],
    description: "使用系统默认DNS服务器"
  },
  {
    id: "ali",
    name: "阿里 AliDNS",
    servers: ["223.5.5.5", "223.6.6.6"],
    description: "阿里巴巴公共DNS，稳定快速"
  },
  {
    id: "baidu",
    name: "百度 BaiduDNS",
    servers: ["180.76.76.76"],
    description: "百度公共DNS服务器"
  },
  {
    id: "114dns",
    name: "114DNS",
    servers: ["114.114.114.114", "114.114.115.115"],
    description: "114DNS，电信联通移动铁通通用"
  },
  {
    id: "114dns_safe",
    name: "114DNS安全版",
    servers: ["114.114.114.119", "114.114.115.119"],
    description: "114DNS安全版，拦截钓鱼网站"
  },
  {
    id: "114dns_family",
    name: "114DNS家庭版",
    servers: ["114.114.114.110", "114.114.115.110"],
    description: "114DNS家庭版，拦截色情网站"
  },
  {
    id: "guansheng",
    name: "关圣云去广告DNS",
    servers: ["2025.dns1.top"],
    description: "关圣云去广告DNS，可过滤广告"
  },
  {
    id: "onedns",
    name: "OneDNS 更新",
    servers: ["117.50.11.11", "117.50.22.22", "112.124.47.27", "114.215.126.16"],
    description: "OneDNS，快速稳定"
  },
  {
    id: "dnsone_north",
    name: "DNS ONE (北方推荐)",
    servers: ["123.207.137.88"],
    description: "DNS ONE 北方用户推荐"
  },
  {
    id: "dnsone_south",
    name: "DNS ONE (南方推荐)",
    servers: ["115.159.220.214"],
    description: "DNS ONE 南方用户推荐"
  },
  {
    id: "dnstwo_north",
    name: "DNS TWO (北方推荐)",
    servers: ["122.114.245.45"],
    description: "DNS TWO 北方用户推荐"
  },
  {
    id: "dnstwo_south",
    name: "DNS TWO (南方推荐)",
    servers: ["115.159.96.69"],
    description: "DNS TWO 南方用户推荐"
  },
  {
    id: "dnsthree_north",
    name: "DNS THREE (北方推荐)",
    servers: ["115.159.157.26"],
    description: "DNS THREE 北方用户推荐"
  },
  {
    id: "dnsthree_south",
    name: "DNS THREE (南方推荐)",
    servers: ["115.159.158.38"],
    description: "DNS THREE 南方用户推荐"
  },
  {
    id: "dnspai_telecom",
    name: "DNS派 (电信/移动/铁通)",
    servers: ["101.226.4.6", "218.30.118.6"],
    description: "DNS派电信/移动/铁通专用"
  },
  {
    id: "dnspai_unicom",
    name: "DNS派 (联通)",
    servers: ["123.125.81.6", "140.207.198.6"],
    description: "DNS派联通专用"
  },
  {
    id: "opener",
    name: "OpenerDNS",
    servers: ["42.120.21.30"],
    description: "OpenerDNS无污染服务器"
  },
  {
    id: "cnnic",
    name: "CNNIC SDNS",
    servers: ["1.2.4.8", "210.2.4.8"],
    description: "CNNIC SDNS服务器"
  },
  {
    id: "camelyun",
    name: "骆驼云安全 CamelYunDns",
    servers: ["63.223.94.66"],
    description: "骆驼云安全公共DNS"
  },
  {
    id: "dnspod",
    name: "腾讯DNSPod DNS+",
    servers: ["119.29.29.29", "119.28.28.28", "182.254.118.118", "182.254.116.116"],
    description: "腾讯DNSPod公共DNS，推荐前两个"
  },
  {
    id: "ustc_telecom",
    name: "中科大防污染DNS (电信)",
    servers: ["202.141.162.123", "202.141.178.13"],
    description: "中科大防污染DNS电信线路"
  },
  {
    id: "ustc_edu",
    name: "中科大防污染DNS (教育网)",
    servers: ["202.38.93.153"],
    description: "中科大防污染DNS教育网线路"
  },
  {
    id: "ustc_mobile",
    name: "中科大防污染DNS (移动)",
    servers: ["202.141.176.93"],
    description: "中科大防污染DNS移动线路"
  },
  {
    id: "pure_south",
    name: "纯净DNS (南方)",
    servers: ["115.159.146.99"],
    description: "干净自由无劫持纯净DNS南方线路"
  },
  {
    id: "pure_north",
    name: "纯净DNS (北方)",
    servers: ["123.206.21.48"],
    description: "干净自由无劫持纯净DNS北方线路"
  },
  {
    id: "bai",
    name: "BAI DNS",
    servers: ["223.113.97.99"],
    description: "支持EDNS智能解析，无污染DNS"
  },
  {
    id: "pdomo",
    name: "PdoMo-DNS",
    servers: ["101.132.183.99", "193.112.15.186"],
    description: "可过滤广告，纯净无劫持"
  },
  {
    id: "fun",
    name: "FUN DNS",
    servers: ["119.23.248.241"],
    description: "FUN DNS服务器"
  },
  {
    id: "cloudflare",
    name: "Cloudflare DNS",
    servers: ["1.1.1.1", "1.0.0.1"],
    description: "Cloudflare提供的全球高速DNS"
  },
  {
    id: "google",
    name: "Google DNS",
    servers: ["8.8.8.8", "8.8.4.4"],
    description: "Google提供的全球DNS服务"
  }
];

// 导出DNS服务器列表
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DNS_SERVERS };
} 