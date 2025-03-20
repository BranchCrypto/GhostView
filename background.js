// GhostView - 高级隐私浏览插件
// 后台服务脚本

// 隐私设置配置
const privacySettings = {
  // 禁用WebRTC (防止IP泄露)
  webRTCIPHandlingPolicy: {
    setting: 'disable_non_proxied_udp'
  },
  
  // 禁用地理位置API
  locationOverride: {
    setting: 2 // 0-默认, 1-允许, 2-禁止
  },
  
  // 禁用第三方cookie
  thirdPartyCookiesAllowed: {
    setting: false
  },
  
  // 禁用网站数据保存
  hyperlinkAuditingEnabled: {
    setting: false
  },
  
  // 发送Do Not Track请求
  doNotTrackEnabled: {
    setting: true
  }
};

// 深色主题配置
const darkTheme = {
  colors: {
    frame: '#1a1a2e',
    toolbar: '#16213e',
    tab_text: '#e6e6e6',
    tab_background_text: '#8e8ea0',
    bookmark_text: '#e6e6e6',
    ntp_background: '#1a1a2e',
    ntp_text: '#e6e6e6',
    button_background: '#232946'
  }
};

// 存储原始主题
let originalTheme = null;

// 代理设置 (模拟Tor网络多层代理)
let proxyConfig = {
  mode: "fixed_servers",
  rules: {
    singleProxy: {
      scheme: "socks5",
      host: "127.0.0.1",
      port: 9050
    },
    bypassList: []
  }
};

// 存储原始设置以便恢复
let originalSettings = {};

// 启用请求修改规则
function enableRequestRules() {
  if (chrome.declarativeNetRequest) {
    chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: ["ruleset_1"]
    }, () => {
      console.log("请求修改规则已启用");
    });
  }
}

// 禁用请求修改规则
function disableRequestRules() {
  if (chrome.declarativeNetRequest) {
    chrome.declarativeNetRequest.updateEnabledRulesets({
      disableRulesetIds: ["ruleset_1"]
    }, () => {
      console.log("请求修改规则已禁用");
    });
  }
}

// 在安装或启动时只存储原始设置，但不自动应用隐私设置
chrome.runtime.onInstalled.addListener(() => {
  console.log("扩展已安装");
  storeOriginalSettings();
  
  // 初始化时确保禁用请求修改规则
  disableRequestRules();
  
  // 确保代理设置是关闭的
  if (chrome.proxy) {
    chrome.proxy.settings.clear({scope: 'regular'}, function() {
      console.log("已清除代理设置");
    });
  }
  
  // 确保扩展安装后隐私模式设置为关闭状态
  isPrivacyModeActive = false;
  chrome.storage.local.set({isPrivacyModeActive: false}, function() {
    console.log("初始化隐私模式状态：关闭");
  });
});

// 存储原始设置
function storeOriginalSettings() {
  console.log("存储原始设置");
  for (const setting in privacySettings) {
    if (chrome.privacy && chrome.privacy.network && chrome.privacy.network[setting]) {
      chrome.privacy.network[setting].get({}, function(details) {
        originalSettings[setting] = details.value;
      });
    } else if (chrome.privacy && chrome.privacy.websites && chrome.privacy.websites[setting]) {
      chrome.privacy.websites[setting].get({}, function(details) {
        originalSettings[setting] = details.value;
      });
    } else if (chrome.privacy && chrome.privacy.services && chrome.privacy.services[setting]) {
      chrome.privacy.services[setting].get({}, function(details) {
        originalSettings[setting] = details.value;
      });
    }
  }
  
  // 存储原始代理设置
  if (chrome.proxy) {
    chrome.proxy.settings.get({}, function(config) {
      originalSettings.proxy = config.value;
    });
  }
}

// 检查Tor网络连接
async function checkTorConnection() {
  return new Promise((resolve) => {
    // 创建一个测试用的fetch请求，通过代理尝试访问check.torproject.org
    // 这个函数将在超时时间后自动失败
    const timeoutDuration = 5000; // 5秒超时
    
    let timeoutId = setTimeout(() => {
      console.log("Tor连接检查超时");
      resolve(false);
    }, timeoutDuration);
    
    fetch("https://check.torproject.org/api/ip", {
      method: "GET",
      mode: "no-cors"
    })
    .then(response => {
      clearTimeout(timeoutId);
      console.log("成功连接到Tor网络");
      resolve(true);
    })
    .catch(error => {
      clearTimeout(timeoutId);
      console.log("无法连接到Tor网络:", error);
      resolve(false);
    });
  });
}

// DNS设置
let currentDNSSettings = {
  enableCustomDNS: false,
  dnsProvider: "system",
  customDNS: "",
  dnsServers: []
};

// 应用DNS设置
function applyDNSSettings() {
  // 从存储中获取设置
  chrome.storage.local.get(['settings'], function(result) {
    if (result.settings) {
      const settings = result.settings;
      
      // 更新当前DNS设置
      currentDNSSettings.enableCustomDNS = settings.enableCustomDNS;
      currentDNSSettings.dnsProvider = settings.dnsProvider;
      currentDNSSettings.customDNS = settings.customDNS;
      
      // 如果启用了自定义DNS
      if (settings.enableCustomDNS) {
        console.log("应用自定义DNS设置:", settings.dnsProvider);
        
        // 获取DNS服务器IP地址
        let dnsServers = [];
        
        if (settings.dnsProvider === 'custom') {
          // 使用用户自定义的DNS服务器
          if (settings.customDNS) {
            dnsServers = settings.customDNS.split(',').map(s => s.trim()).filter(s => s);
            configureDNS(dnsServers);
          }
        } else {
          // 使用预定义DNS提供商
          // 直接从存储获取DNS配置
          chrome.storage.local.get(['dns_servers'], function(result) {
            if (result.dns_servers) {
              const dnsProvider = result.dns_servers.find(dns => dns.id === settings.dnsProvider);
              if (dnsProvider && dnsProvider.servers.length > 0) {
                dnsServers = dnsProvider.servers;
                configureDNS(dnsServers);
                
                // 保存当前DNS服务器列表
                currentDNSSettings.dnsServers = dnsServers;
              }
            } else {
              // 如果存储中没有DNS服务器列表，则尝试加载配置文件
              console.log("存储中没有DNS服务器列表，尝试从配置文件加载");
              // 发送消息给选项页面，请求加载DNS配置
              try {
                chrome.runtime.sendMessage({action: 'loadDNSConfig'});
              } catch (error) {
                console.error("无法发送加载DNS配置的消息:", error);
              }
            }
          });
        }
      } else {
        // 恢复默认DNS
        restoreDNSSettings();
      }
    }
  });
}

// 配置DNS服务器
function configureDNS(dnsServers) {
  console.log("配置DNS服务器:", dnsServers);
  
  // Chrome扩展API限制，不能直接修改系统DNS设置
  // 我们通过通知指导用户如何手动设置DNS
  try {
    // 创建详细的通知
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/logo.png',
      title: 'GhostView DNS设置提示',
      message: `由于浏览器限制，GhostView无法自动修改系统DNS。请手动将您的DNS设置为: ${dnsServers.join(', ')}`,
      priority: 2
    });
    
    // 打开一个新标签页，提供DNS设置指南
    chrome.tabs.create({
      url: chrome.runtime.getURL('dns_guide.html') + `?dns=${encodeURIComponent(dnsServers.join(','))}`
    });
  } catch (error) {
    console.error("DNS设置通知创建失败:", error);
  }
  
  // 记录DNS服务器变更
  console.log("已选择DNS服务器:", dnsServers);
}

// 恢复默认DNS设置
function restoreDNSSettings() {
  console.log("恢复默认DNS设置");
  currentDNSSettings = {
    enableCustomDNS: false,
    dnsProvider: "system",
    customDNS: "",
    dnsServers: []
  };
}

// 应用深色主题
function applyDarkTheme() {
  // 存储当前主题设置（如果尚未存储）
  if (originalTheme === null) {
    // 兼容性处理，支持新旧版本Chrome API
    if (chrome.theme.getCurrent) {
      chrome.theme.getCurrent().then(theme => {
        originalTheme = theme;
        console.log("已存储原始主题设置:", originalTheme);
      }).catch(error => {
        console.error("获取当前主题失败:", error);
      });
    } else {
      // 老版本API
      chrome.theme.getCurrent(theme => {
        originalTheme = theme;
        console.log("已存储原始主题设置:", originalTheme);
      });
    }
  }
  
  // 应用深色主题
  try {
    // 兼容性处理，支持新旧版本Chrome API
    if (chrome.theme.update.constructor.name === 'AsyncFunction') {
      chrome.theme.update(darkTheme).then(() => {
        console.log("已应用深色主题");
      }).catch(error => {
        console.error("应用深色主题失败:", error);
      });
    } else {
      // 老版本API
      chrome.theme.update(darkTheme, () => {
        if (chrome.runtime.lastError) {
          console.error("应用深色主题失败:", chrome.runtime.lastError);
        } else {
          console.log("已应用深色主题");
        }
      });
    }
  } catch (error) {
    console.error("应用主题时发生错误:", error);
  }
}

// 恢复原始主题
function restoreOriginalTheme() {
  try {
    // 如果有存储的原始主题，则恢复
    if (originalTheme) {
      // 兼容性处理，支持新旧版本Chrome API
      if (chrome.theme.update.constructor.name === 'AsyncFunction') {
        chrome.theme.update(originalTheme).then(() => {
          console.log("已恢复原始主题");
        }).catch(error => {
          console.error("恢复原始主题失败:", error);
        });
      } else {
        // 老版本API
        chrome.theme.update(originalTheme, () => {
          if (chrome.runtime.lastError) {
            console.error("恢复原始主题失败:", chrome.runtime.lastError);
          } else {
            console.log("已恢复原始主题");
          }
        });
      }
    } else {
      // 如果没有存储的原始主题，则重置为浏览器默认
      if (chrome.theme.reset.constructor.name === 'AsyncFunction') {
        chrome.theme.reset().then(() => {
          console.log("已重置为浏览器默认主题");
        }).catch(error => {
          console.error("重置主题失败:", error);
        });
      } else {
        // 老版本API
        chrome.theme.reset(() => {
          if (chrome.runtime.lastError) {
            console.error("重置主题失败:", chrome.runtime.lastError);
          } else {
            console.log("已重置为浏览器默认主题");
          }
        });
      }
    }
  } catch (error) {
    console.error("恢复主题时发生错误:", error);
  }
}

// 应用隐私设置
async function applyPrivacySettings() {
  console.log("开始应用隐私设置");
  try {
    // 应用各种隐私设置
    for (const setting in privacySettings) {
      try {
        if (chrome.privacy && chrome.privacy.network && chrome.privacy.network[setting]) {
          await new Promise((resolve) => {
            chrome.privacy.network[setting].set({
              value: privacySettings[setting].setting,
              scope: 'regular'
            }, () => {
              if (chrome.runtime.lastError) {
                console.warn(`设置 ${setting} 失败:`, chrome.runtime.lastError);
              } else {
                console.log(`成功应用设置: ${setting}`);
              }
              resolve();
            });
          });
        } else if (chrome.privacy && chrome.privacy.websites && chrome.privacy.websites[setting]) {
          await new Promise((resolve) => {
            chrome.privacy.websites[setting].set({
              value: privacySettings[setting].setting,
              scope: 'regular'
            }, () => {
              if (chrome.runtime.lastError) {
                console.warn(`设置 ${setting} 失败:`, chrome.runtime.lastError);
              } else {
                console.log(`成功应用设置: ${setting}`);
              }
              resolve();
            });
          });
        } else if (chrome.privacy && chrome.privacy.services && chrome.privacy.services[setting]) {
          await new Promise((resolve) => {
            chrome.privacy.services[setting].set({
              value: privacySettings[setting].setting,
              scope: 'regular'
            }, () => {
              if (chrome.runtime.lastError) {
                console.warn(`设置 ${setting} 失败:`, chrome.runtime.lastError);
              } else {
                console.log(`成功应用设置: ${setting}`);
              }
              resolve();
            });
          });
        }
      } catch (settingError) {
        console.error(`应用设置 ${setting} 时出错:`, settingError);
        // 继续应用其他设置
      }
    }
    
    // 应用深色主题
    try {
      applyDarkTheme();
    } catch (themeError) {
      console.error("应用深色主题时出错:", themeError);
    }
    
    // 应用DNS设置
    try {
      applyDNSSettings();
    } catch (dnsError) {
      console.error("应用DNS设置时出错:", dnsError);
    }
    
    // 检查Tor网络连接状态
    let isTorConnected = false;
    try {
      isTorConnected = await checkTorConnection();
    } catch (torError) {
      console.error("检查Tor连接时出错:", torError);
    }
    
    // 设置代理
    if (chrome.proxy) {
      try {
        if (isTorConnected) {
          // 如果Tor网络可连接，则设置代理
          await new Promise((resolve) => {
            chrome.proxy.settings.set({
              value: proxyConfig,
              scope: 'regular'
            }, () => {
              if (chrome.runtime.lastError) {
                console.warn("设置Tor代理失败:", chrome.runtime.lastError);
              } else {
                console.log("已设置Tor代理");
              }
              resolve();
            });
          });
        } else {
          // 如果Tor网络不可连接，则不设置代理并通知用户
          await new Promise((resolve) => {
            chrome.proxy.settings.clear({scope: 'regular'}, () => {
              console.log("Tor网络不可连接，已禁用代理设置");
              resolve();
            });
          });
          
          // 通知用户Tor网络不可用
          try {
            chrome.notifications.create({
              type: 'basic',
              iconUrl: 'icons/logo.png',
              title: 'GhostView 隐私提示',
              message: '无法连接到Tor网络，隐私保护模式将在不使用代理的情况下运行。',
              priority: 2
            });
          } catch (notifyError) {
            console.error("创建通知失败:", notifyError);
          }
        }
      } catch (proxyError) {
        console.error("设置代理时出错:", proxyError);
      }
    }
    
    // 启用请求修改规则
    try {
      enableRequestRules();
    } catch (ruleError) {
      console.error("启用请求修改规则时出错:", ruleError);
    }
    
    // 清除浏览数据
    try {
      clearBrowsingData();
    } catch (clearError) {
      console.error("清除浏览数据时出错:", clearError);
    }
    
    console.log("隐私设置应用完成");
    return isTorConnected;
  } catch (error) {
    console.error("应用隐私设置时出现严重错误:", error);
    // 即使有错误，我们仍然认为隐私模式已启用
    return false;
  }
}

// 清除浏览数据
function clearBrowsingData() {
  console.log("清除浏览数据");
  chrome.browsingData.remove({
    "since": 0
  }, {
    "appcache": true,
    "cache": true,
    "cacheStorage": true,
    "cookies": true,
    "downloads": true,
    "fileSystems": true,
    "formData": true,
    "history": true,
    "indexedDB": true,
    "localStorage": true,
    "pluginData": true,
    "passwords": true,
    "serviceWorkers": true,
    "webSQL": true
  });
}

// 监听用户激活隐私模式
chrome.action.onClicked.addListener((tab) => {
  console.log("扩展图标被点击");
  // 切换隐私模式
  togglePrivacyMode();
});

// 当前是否激活
let isPrivacyModeActive = false;

// 切换隐私模式
async function togglePrivacyMode() {
  console.log("切换隐私模式，当前状态:", isPrivacyModeActive);
  try {
    if (isPrivacyModeActive) {
      // 恢复原始设置
      restoreOriginalSettings();
      isPrivacyModeActive = false;
      chrome.action.setIcon({path: "icons/logo.png"});
      
      // 移除边框
      chrome.tabs.query({}, function(tabs) {
        tabs.forEach(function(tab) {
          try {
            chrome.scripting.executeScript({
              target: {tabId: tab.id},
              function: removePrivacyBorder
            }).catch(function(error) {
              console.error("移除边框时发生错误:", error);
            });
          } catch (error) {
            console.error("执行脚本时发生错误:", error, "标签页ID:", tab.id);
          }
        });
      });
      
      // 保存状态
      chrome.storage.local.set({isPrivacyModeActive: isPrivacyModeActive});
      console.log("隐私模式已禁用");
      return false; // 返回Tor连接状态
    } else {
      // 应用隐私设置
      const torConnected = await applyPrivacySettings();
      isPrivacyModeActive = true;
      chrome.action.setIcon({path: "icons/active_logo.png"});
      
      // 添加边框
      chrome.tabs.query({}, function(tabs) {
        tabs.forEach(function(tab) {
          try {
            chrome.scripting.executeScript({
              target: {tabId: tab.id},
              function: addPrivacyBorder
            }).catch(function(error) {
              console.error("添加边框时发生错误:", error);
            });
          } catch (error) {
            console.error("执行脚本时发生错误:", error, "标签页ID:", tab.id);
          }
        });
      });
      
      // 保存状态
      chrome.storage.local.set({isPrivacyModeActive: isPrivacyModeActive});
      console.log("隐私模式已启用，Tor连接状态:", torConnected);
      return torConnected;
    }
  } catch (error) {
    console.error("切换隐私模式时发生错误:", error);
    // 出错时保持当前状态
    chrome.storage.local.set({isPrivacyModeActive: isPrivacyModeActive});
    return false;
  }
}

// 添加隐私保护边框的函数
function addPrivacyBorder() {
  // 确保仅在文档完全加载后执行
  if (document.readyState !== 'complete') {
    window.addEventListener('load', function() {
      addPrivacyBorderToPage();
    });
  } else {
    addPrivacyBorderToPage();
  }
}

// 实际在页面添加边框的函数
function addPrivacyBorderToPage() {
  try {
    // 如果边框已存在，则不重复添加
    if (document.getElementById('ghostview-privacy-border')) {
      return;
    }
    
    // 创建边框元素
    const border = document.createElement('div');
    border.id = 'ghostview-privacy-border';
    border.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
      pointer-events: none;
      z-index: 2147483647;
      border: 8px solid rgba(255, 255, 255, 0.2);
      background-color: transparent;
    `;
    
    // 创建图标容器
    const iconContainer = document.createElement('div');
    iconContainer.id = 'ghostview-privacy-icon';
    iconContainer.style.cssText = `
      position: fixed;
      bottom: 10px;
      right: 10px;
      width: 40px;
      height: 40px;
      background-color: white;
      border-radius: 50%;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2147483647;
      pointer-events: none;
    `;
    
    // 设置背景图标
    const iconImg = document.createElement('img');
    iconImg.src = chrome.runtime.getURL('icons/bg.png');
    iconImg.style.cssText = `
      width: 30px;
      height: 30px;
      object-fit: contain;
    `;
    
    iconContainer.appendChild(iconImg);
    
    // 添加到页面
    document.body.appendChild(border);
    document.body.appendChild(iconContainer);
    
    console.log("隐私保护边框已添加");
  } catch (error) {
    console.error("添加隐私保护边框时发生错误:", error);
  }
}

// 移除隐私保护边框的函数
function removePrivacyBorder() {
  try {
    // 确保仅在文档完全加载后执行
    if (document.readyState !== 'complete') {
      window.addEventListener('load', function() {
        removePrivacyBorderFromPage();
      });
    } else {
      removePrivacyBorderFromPage();
    }
  } catch (error) {
    console.error("移除隐私保护边框时发生错误:", error);
  }
}

// 实际从页面移除边框的函数
function removePrivacyBorderFromPage() {
  try {
    // 移除边框
    const border = document.getElementById('ghostview-privacy-border');
    if (border) {
      border.remove();
    }
    
    // 移除图标
    const iconContainer = document.getElementById('ghostview-privacy-icon');
    if (iconContainer) {
      iconContainer.remove();
    }
    
    // 备用方法：移除所有匹配的元素（如果ID方法失败）
    const backupBorders = document.querySelectorAll('div[style*="border: 8px solid"]');
    backupBorders.forEach(element => {
      element.remove();
    });
    
    // 备用方法：移除图标容器
    const backupIcons = document.querySelectorAll('div[style*="position: fixed"][style*="bottom: 10px"][style*="right: 10px"]');
    backupIcons.forEach(element => {
      if (element.querySelector('img')) {
        element.remove();
      }
    });
    
    console.log("隐私保护边框已移除");
  } catch (error) {
    console.error("移除隐私保护边框元素时发生错误:", error);
  }
}

// 恢复原始设置
function restoreOriginalSettings() {
  console.log("恢复原始设置");
  // 恢复各种隐私设置
  for (const setting in originalSettings) {
    if (setting === 'proxy') continue;
    
    if (chrome.privacy && chrome.privacy.network && chrome.privacy.network[setting]) {
      chrome.privacy.network[setting].set({
        value: originalSettings[setting],
        scope: 'regular'
      });
    } else if (chrome.privacy && chrome.privacy.websites && chrome.privacy.websites[setting]) {
      chrome.privacy.websites[setting].set({
        value: originalSettings[setting],
        scope: 'regular'
      });
    } else if (chrome.privacy && chrome.privacy.services && chrome.privacy.services[setting]) {
      chrome.privacy.services[setting].set({
        value: originalSettings[setting],
        scope: 'regular'
      });
    }
  }
  
  // 恢复原始主题
  restoreOriginalTheme();
  
  // 恢复DNS设置
  restoreDNSSettings();
  
  // 恢复代理设置 - 改为直接清除代理设置
  if (chrome.proxy) {
    chrome.proxy.settings.clear({scope: 'regular'}, function() {
      console.log("已清除代理设置");
    });
  }
  
  // 禁用请求修改规则
  disableRequestRules();
}

// 恢复保存的状态，但不自动应用隐私设置
chrome.storage.local.get(['isPrivacyModeActive'], function(result) {
  console.log("恢复保存的状态:", result);
  
  // 确保安装后默认关闭隐私模式
  if (result.isPrivacyModeActive === undefined) {
    isPrivacyModeActive = false;
    chrome.storage.local.set({isPrivacyModeActive: false});
  } else {
    // 使用存储的值
    isPrivacyModeActive = result.isPrivacyModeActive;
  }
  
  // 如果隐私模式处于活动状态，确保设置正确的图标
  if (isPrivacyModeActive) {
    chrome.action.setIcon({path: "icons/active_logo.png"});
  } else {
    // 确保在未激活状态下禁用所有隐私设置
    if (chrome.proxy) {
      chrome.proxy.settings.clear({scope: 'regular'});
    }
    disableRequestRules();
    
    // 如果之前有激活过主题，恢复原始主题
    restoreOriginalTheme();
  }
});

// 监听来自popup.js的消息
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    console.log("收到消息:", request);
    
    if (request.action === 'togglePrivacyMode') {
      // 根据popup的请求切换隐私模式
      if (request.enabled !== undefined) {
        if (request.enabled && !isPrivacyModeActive) {
          // 异步应用隐私设置
          (async () => {
            try {
              const torConnected = await applyPrivacySettings();
              isPrivacyModeActive = true;
              chrome.action.setIcon({path: "icons/active_logo.png"});
              chrome.storage.local.set({isPrivacyModeActive: isPrivacyModeActive});
              
              // 为所有标签页添加边框
              chrome.tabs.query({}, function(tabs) {
                tabs.forEach(function(tab) {
                  try {
                    chrome.scripting.executeScript({
                      target: {tabId: tab.id},
                      function: addPrivacyBorder
                    }).catch(function(error) {
                      console.error("添加边框时发生错误:", error);
                    });
                  } catch (error) {
                    console.error("执行脚本时发生错误:", error, "标签页ID:", tab.id);
                  }
                });
              });
              
              // 成功完成所有操作，返回响应
              sendResponse({
                success: true, 
                isActive: isPrivacyModeActive, 
                torConnected: torConnected
              });
            } catch (error) {
              console.error("应用隐私设置过程中发生错误:", error);
              sendResponse({
                success: false,
                error: "应用隐私设置失败: " + error.message,
                isActive: isPrivacyModeActive
              });
            }
          })();
        } else if (!request.enabled && isPrivacyModeActive) {
          // 禁用隐私模式
          (async () => {
            try {
              await new Promise(resolve => {
                try {
                  restoreOriginalSettings();
                  resolve();
                } catch (error) {
                  console.error("恢复原始设置时发生错误:", error);
                  resolve(); // 即使有错误也继续执行
                }
              });
              
              isPrivacyModeActive = false;
              chrome.action.setIcon({path: "icons/logo.png"});
              chrome.storage.local.set({isPrivacyModeActive: isPrivacyModeActive});
              
              // 为所有标签页移除边框
              chrome.tabs.query({}, function(tabs) {
                tabs.forEach(function(tab) {
                  try {
                    chrome.scripting.executeScript({
                      target: {tabId: tab.id},
                      function: removePrivacyBorder
                    }).catch(function(error) {
                      console.error("移除边框时发生错误:", error);
                    });
                  } catch (error) {
                    console.error("执行脚本时发生错误:", error, "标签页ID:", tab.id);
                  }
                });
              });
              
              sendResponse({success: true, isActive: isPrivacyModeActive});
            } catch (error) {
              console.error("禁用隐私模式过程中发生错误:", error);
              sendResponse({
                success: false,
                error: "禁用隐私模式失败: " + error.message,
                isActive: isPrivacyModeActive
              });
            }
          })();
        } else {
          // 状态未改变，返回当前状态
          sendResponse({success: true, isActive: isPrivacyModeActive});
        }
      } else {
        // 未提供 enabled 参数
        sendResponse({
          success: false, 
          error: "未提供 enabled 参数",
          isActive: isPrivacyModeActive
        });
      }
      // 告诉Chrome我们想要异步发送响应
      return true;
    } 
    else if (request.action === 'getPrivacyStatus') {
      // 返回当前隐私模式状态
      sendResponse({isActive: isPrivacyModeActive});
      return false;  // 同步响应
    }
    else if (request.action === 'clearBrowsingData') {
      // 清除浏览数据
      try {
        clearBrowsingData();
        sendResponse({success: true});
      } catch (error) {
        console.error("清除浏览数据时发生错误:", error);
        sendResponse({success: false, error: error.message});
      }
      return false;  // 同步响应
    }
    else if (request.action === 'checkTorConnection') {
      // 检查Tor连接状态
      checkTorConnection().then(connected => {
        sendResponse({connected: connected && isPrivacyModeActive});
      }).catch(error => {
        console.error("检查Tor连接时发生错误:", error);
        sendResponse({connected: false, error: error.message});
      });
      // 告诉Chrome我们想要异步发送响应
      return true;
    }
    else if (request.action === 'updateSettings') {
      // 更新设置
      if (request.settings) {
        // 更新Tor代理设置
        if (request.settings.enableTor !== undefined) {
          if (request.settings.enableTor) {
            proxyConfig.mode = "fixed_servers";
            proxyConfig.rules.singleProxy.host = request.settings.torHost || "127.0.0.1";
            proxyConfig.rules.singleProxy.port = request.settings.torPort || 9050;
          } else {
            proxyConfig.mode = "direct";
          }
          
          if (isPrivacyModeActive && chrome.proxy) {
            chrome.proxy.settings.set({
              value: proxyConfig, 
              scope: 'regular'
            });
          }
        }
        
        // 更新DNS设置
        if (request.settings.enableCustomDNS !== undefined) {
          currentDNSSettings.enableCustomDNS = request.settings.enableCustomDNS;
          currentDNSSettings.dnsProvider = request.settings.dnsProvider || "system";
          currentDNSSettings.customDNS = request.settings.customDNS || "";
          
          if (isPrivacyModeActive) {
            if (currentDNSSettings.enableCustomDNS) {
              applyDNSSettings();
            } else {
              restoreDNSSettings();
            }
          }
        }
        
        // 其他设置更新可以在这里添加
        
        sendResponse({success: true});
      }
    }
    else if (request.action === 'getDNSStatus') {
      // 返回当前DNS状态
      sendResponse({
        enableCustomDNS: currentDNSSettings.enableCustomDNS,
        dnsProvider: currentDNSSettings.dnsProvider,
        dnsServers: currentDNSSettings.dnsServers
      });
    }
    
    // 默认返回true，告诉Chrome我们可能异步发送响应
    return true;
  }
);

// 网络请求监控
let isCapturingRequests = false;
let devToolsTabs = [];

// 请求监听器
function onBeforeRequestListener(details) {
  // 将请求信息发送给开发者工具页面
  const requestData = {
    requestId: details.requestId,
    url: details.url,
    method: details.method,
    type: details.type,
    timeStamp: details.timeStamp,
    fromCache: false
  };
  
  // 发送给所有打开的开发者工具页面
  notifyDevTools({
    action: 'newRequest',
    requestData: requestData
  });
  
  // 不修改请求
  return {};
}

// 请求完成监听器
function onCompletedListener(details) {
  // 更新请求状态
  const requestData = {
    requestId: details.requestId,
    url: details.url,
    method: details.method,
    type: details.type,
    timeStamp: details.timeStamp,
    statusCode: details.statusCode,
    statusLine: details.statusLine,
    fromCache: details.fromCache,
    responseHeaders: details.responseHeaders
  };
  
  // 发送给所有打开的开发者工具页面
  notifyDevTools({
    action: 'newRequest',
    requestData: requestData
  });
}

// 请求错误监听器
function onErrorListener(details) {
  // 更新请求状态
  const requestData = {
    requestId: details.requestId,
    url: details.url,
    method: details.method,
    type: details.type,
    timeStamp: details.timeStamp,
    error: details.error,
    fromCache: false
  };
  
  // 发送给所有打开的开发者工具页面
  notifyDevTools({
    action: 'newRequest',
    requestData: requestData
  });
}

// 请求头信息监听器
function onSendHeadersListener(details) {
  // 更新请求头信息
  const requestData = {
    requestId: details.requestId,
    url: details.url,
    method: details.method,
    type: details.type,
    timeStamp: details.timeStamp,
    requestHeaders: details.requestHeaders
  };
  
  // 发送给所有打开的开发者工具页面
  notifyDevTools({
    action: 'newRequest',
    requestData: requestData
  });
}

// 响应头信息监听器
function onHeadersReceivedListener(details) {
  // 获取内容类型
  let contentType = '';
  if (details.responseHeaders) {
    for (const header of details.responseHeaders) {
      if (header.name.toLowerCase() === 'content-type') {
        contentType = header.value;
        break;
      }
    }
  }
  
  // 更新响应头信息
  const requestData = {
    requestId: details.requestId,
    url: details.url,
    method: details.method,
    type: details.type,
    timeStamp: details.timeStamp,
    statusCode: details.statusCode,
    statusLine: details.statusLine,
    responseHeaders: details.responseHeaders,
    contentType: contentType,
    statusText: details.statusLine ? details.statusLine.split(' ').slice(2).join(' ') : ''
  };
  
  // 发送给所有打开的开发者工具页面
  notifyDevTools({
    action: 'newRequest',
    requestData: requestData
  });
}

// 启动请求捕获
function startRequestCapture() {
  if (isCapturingRequests) return;
  
  console.log("启动网络请求捕获");
  
  // 监听网络请求
  chrome.webRequest.onBeforeRequest.addListener(
    onBeforeRequestListener,
    {urls: ["<all_urls>"]},
    []
  );
  
  // 监听请求头
  chrome.webRequest.onSendHeaders.addListener(
    onSendHeadersListener,
    {urls: ["<all_urls>"]},
    ["requestHeaders"]
  );
  
  // 监听响应头
  chrome.webRequest.onHeadersReceived.addListener(
    onHeadersReceivedListener,
    {urls: ["<all_urls>"]},
    ["responseHeaders"]
  );
  
  // 监听请求完成
  chrome.webRequest.onCompleted.addListener(
    onCompletedListener,
    {urls: ["<all_urls>"]},
    ["responseHeaders"]
  );
  
  // 监听请求错误
  chrome.webRequest.onErrorOccurred.addListener(
    onErrorListener,
    {urls: ["<all_urls>"]}
  );
  
  isCapturingRequests = true;
}

// 停止请求捕获
function stopRequestCapture() {
  if (!isCapturingRequests) return;
  
  console.log("停止网络请求捕获");
  
  // 移除所有监听器
  if (chrome.webRequest.onBeforeRequest.hasListener(onBeforeRequestListener)) {
    chrome.webRequest.onBeforeRequest.removeListener(onBeforeRequestListener);
  }
  
  if (chrome.webRequest.onSendHeaders.hasListener(onSendHeadersListener)) {
    chrome.webRequest.onSendHeaders.removeListener(onSendHeadersListener);
  }
  
  if (chrome.webRequest.onHeadersReceived.hasListener(onHeadersReceivedListener)) {
    chrome.webRequest.onHeadersReceived.removeListener(onHeadersReceivedListener);
  }
  
  if (chrome.webRequest.onCompleted.hasListener(onCompletedListener)) {
    chrome.webRequest.onCompleted.removeListener(onCompletedListener);
  }
  
  if (chrome.webRequest.onErrorOccurred.hasListener(onErrorListener)) {
    chrome.webRequest.onErrorOccurred.removeListener(onErrorListener);
  }
  
  isCapturingRequests = false;
}

// 发送消息给所有开发者工具页面
function notifyDevTools(message) {
  // 检查开发者工具标签页是否仍然存在
  devToolsTabs = devToolsTabs.filter(function(tabId) {
    const port = chrome.tabs.connect(tabId, {name: "ghostview-devtools"});
    return !chrome.runtime.lastError;
  });
  
  // 发送消息给每个开发者工具标签页
  devToolsTabs.forEach(function(tabId) {
    chrome.tabs.sendMessage(tabId, message, function(response) {
      // 忽略错误
    });
  });
}

// 监听来自开发者工具页面的消息
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    // ... existing code ...
    
    if (request.action === 'startRequestCapture') {
      // 开始捕获请求
      startRequestCapture();
      
      // 添加标签页到列表
      if (sender.tab && sender.tab.id) {
        if (!devToolsTabs.includes(sender.tab.id)) {
          devToolsTabs.push(sender.tab.id);
        }
      }
      
      sendResponse({success: true});
    }
    else if (request.action === 'stopRequestCapture') {
      // 停止捕获请求
      if (devToolsTabs.length <= 1) {
        stopRequestCapture();
      }
      
      // 从列表中移除标签页
      if (sender.tab && sender.tab.id) {
        const index = devToolsTabs.indexOf(sender.tab.id);
        if (index !== -1) {
          devToolsTabs.splice(index, 1);
        }
      }
      
      sendResponse({success: true});
    }
    
    // 告诉Chrome我们想要异步发送响应
    return true;
  }
);

// 监听标签页关闭
chrome.tabs.onRemoved.addListener(function(tabId) {
  // 检查是否是开发者工具标签页
  const index = devToolsTabs.indexOf(tabId);
  if (index !== -1) {
    // 从列表中移除
    devToolsTabs.splice(index, 1);
    
    // 如果没有其他开发者工具标签页，停止捕获
    if (devToolsTabs.length === 0) {
      stopRequestCapture();
    }
  }
}); 