// GhostView - 高级设置页面脚本

// 默认设置
const defaultSettings = {
  // Tor设置
  enableTor: false,
  torHost: "127.0.0.1",
  torPort: 9050,
  
  // 隐私设置
  blockWebRTC: true,
  disableGeolocation: true,
  blockCookies: true,
  blockStorage: true,
  sendDNT: true,
  
  // 用户代理设置
  fakeUserAgent: true,
  userAgentType: "generic",
  customUA: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36",
  
  // DNS设置
  enableCustomDNS: false,
  dnsProvider: "system",
  customDNS: "",
  
  // 数据管理
  autoClear: true
};

// 动态加载DNS服务器列表
let DNS_SERVERS = [];

// 获取DOM元素
document.addEventListener('DOMContentLoaded', function() {
  // Tor设置元素
  const enableTor = document.getElementById('enableTor');
  const torHost = document.getElementById('torHost');
  const torPort = document.getElementById('torPort');
  
  // 隐私设置元素
  const blockWebRTC = document.getElementById('blockWebRTC');
  const disableGeolocation = document.getElementById('disableGeolocation');
  const blockCookies = document.getElementById('blockCookies');
  const blockStorage = document.getElementById('blockStorage');
  const sendDNT = document.getElementById('sendDNT');
  
  // 用户代理设置元素
  const fakeUserAgent = document.getElementById('fakeUserAgent');
  const userAgentType = document.getElementById('userAgentType');
  const customUA = document.getElementById('customUA');
  const customUAContainer = document.getElementById('customUAContainer');
  
  // DNS设置元素
  const enableCustomDNS = document.getElementById('enableCustomDNS');
  const dnsProvider = document.getElementById('dnsProvider');
  const customDNS = document.getElementById('customDNS');
  const customDNSContainer = document.getElementById('customDNSContainer');
  const dnsDescription = document.getElementById('dnsDescription');
  
  // 数据管理元素
  const autoClear = document.getElementById('autoClear');
  const clearAllData = document.getElementById('clearAllData');
  
  // 按钮
  const restoreDefaults = document.getElementById('restoreDefaults');
  const saveSettings = document.getElementById('saveSettings');
  
  // 加载DNS服务器列表
  loadDNSServers();
  
  // 加载保存的设置
  loadSettings();
  
  // 事件监听
  userAgentType.addEventListener('change', function() {
    // 如果选择"自定义"，显示自定义用户代理输入框
    if (userAgentType.value === 'custom') {
      customUAContainer.style.display = 'block';
    } else {
      customUAContainer.style.display = 'none';
    }
  });
  
  // DNS提供商切换
  dnsProvider.addEventListener('change', function() {
    updateDNSDescription();
    
    // 如果选择"自定义"，显示自定义DNS输入框
    if (dnsProvider.value === 'custom') {
      customDNSContainer.style.display = 'block';
    } else {
      customDNSContainer.style.display = 'none';
    }
  });
  
  // 启用/禁用自定义DNS开关
  enableCustomDNS.addEventListener('change', function() {
    const enabled = enableCustomDNS.checked;
    dnsProvider.disabled = !enabled;
    customDNS.disabled = !enabled || dnsProvider.value !== 'custom';
    
    if (!enabled) {
      dnsDescription.textContent = "禁用自定义DNS时，将使用系统默认DNS服务器。";
    } else {
      updateDNSDescription();
    }
  });
  
  // 清除所有数据按钮
  clearAllData.addEventListener('click', function() {
    chrome.runtime.sendMessage({action: 'clearBrowsingData'}, function(response) {
      if (response && response.success) {
        showNotification('浏览数据已清除');
      }
    });
  });
  
  // 恢复默认设置按钮
  restoreDefaults.addEventListener('click', function() {
    if (confirm('确定要恢复默认设置吗？这将覆盖您的所有自定义设置。')) {
      applySettings(defaultSettings);
      showNotification('已恢复默认设置');
    }
  });
  
  // 保存设置按钮
  saveSettings.addEventListener('click', function() {
    const settings = collectSettings();
    
    // 保存到存储
    chrome.storage.local.set({settings: settings}, function() {
      // 通知后台更新设置
      chrome.runtime.sendMessage({action: 'updateSettings', settings: settings}, function(response) {
        if (response && response.success) {
          showNotification('设置已保存');
        }
      });
    });
  });
  
  // 加载DNS服务器列表
  function loadDNSServers() {
    // 直接导入DNS_SERVERS变量
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('js/dns_config.js');
    script.onload = function() {
      // 等待脚本加载完成后调用populateDNSOptions
      setTimeout(function() {
        populateDNSOptions();
        // 保存DNS服务器列表到存储中，供后台脚本使用
        if (window.DNS_SERVERS && window.DNS_SERVERS.length > 0) {
          chrome.storage.local.set({dns_servers: window.DNS_SERVERS}, function() {
            console.log("DNS服务器列表已保存到存储");
          });
        }
      }, 100);
    };
    script.onerror = function(error) {
      console.error("加载DNS配置失败:", error);
      // 添加一个自定义选项作为后备
      addDNSOption('custom', '自定义DNS', '', '手动指定DNS服务器');
    };
    document.head.appendChild(script);
  }
  
  // 填充DNS选项
  function populateDNSOptions() {
    // 确保DNS_SERVERS是可用的
    if (typeof window.DNS_SERVERS !== 'undefined' && window.DNS_SERVERS.length > 0) {
      // 清除现有选项，除了system
      while (dnsProvider.options.length > 1) {
        dnsProvider.remove(1);
      }
      
      // 添加自定义选项
      addDNSOption('custom', '自定义DNS', '', '手动指定DNS服务器');
      
      // 添加配置中的DNS服务器
      window.DNS_SERVERS.forEach(dns => {
        if (dns.id !== 'system') { // 系统默认选项已经存在
          addDNSOption(dns.id, dns.name, dns.servers.join(', '), dns.description);
        }
      });
      
      console.log("已加载 " + window.DNS_SERVERS.length + " 个DNS服务器选项");
    } else {
      console.error("DNS_SERVERS变量未定义或为空");
      // 添加一个自定义选项作为后备
      addDNSOption('custom', '自定义DNS', '', '手动指定DNS服务器');
    }
  }
  
  // 添加DNS选项
  function addDNSOption(id, name, servers, description) {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = name;
    option.setAttribute('data-servers', servers);
    option.setAttribute('data-description', description);
    dnsProvider.appendChild(option);
  }
  
  // 更新DNS描述
  function updateDNSDescription() {
    const selectedOption = dnsProvider.options[dnsProvider.selectedIndex];
    const description = selectedOption.getAttribute('data-description');
    const servers = selectedOption.getAttribute('data-servers');
    
    if (dnsProvider.value === 'system') {
      dnsDescription.textContent = "使用系统默认DNS服务器。";
    } else if (dnsProvider.value === 'custom') {
      dnsDescription.textContent = "请输入自定义DNS服务器IP地址，以逗号分隔多个地址。";
    } else if (description) {
      dnsDescription.textContent = `${description} (${servers})`;
    } else {
      dnsDescription.textContent = `使用 ${selectedOption.textContent} DNS服务器。`;
    }
  }
  
  // 收集当前设置
  function collectSettings() {
    return {
      // Tor设置
      enableTor: enableTor.checked,
      torHost: torHost.value,
      torPort: parseInt(torPort.value, 10),
      
      // 隐私设置
      blockWebRTC: blockWebRTC.checked,
      disableGeolocation: disableGeolocation.checked,
      blockCookies: blockCookies.checked,
      blockStorage: blockStorage.checked,
      sendDNT: sendDNT.checked,
      
      // 用户代理设置
      fakeUserAgent: fakeUserAgent.checked,
      userAgentType: userAgentType.value,
      customUA: customUA.value,
      
      // DNS设置
      enableCustomDNS: enableCustomDNS.checked,
      dnsProvider: dnsProvider.value,
      customDNS: customDNS.value,
      
      // 数据管理
      autoClear: autoClear.checked
    };
  }
  
  // 加载保存的设置
  function loadSettings() {
    chrome.storage.local.get(['settings'], function(result) {
      const settings = result.settings || defaultSettings;
      applySettings(settings);
    });
  }
  
  // 应用设置到UI
  function applySettings(settings) {
    // Tor设置
    enableTor.checked = settings.enableTor;
    torHost.value = settings.torHost;
    torPort.value = settings.torPort;
    
    // 隐私设置
    blockWebRTC.checked = settings.blockWebRTC;
    disableGeolocation.checked = settings.disableGeolocation;
    blockCookies.checked = settings.blockCookies;
    blockStorage.checked = settings.blockStorage;
    sendDNT.checked = settings.sendDNT;
    
    // 用户代理设置
    fakeUserAgent.checked = settings.fakeUserAgent;
    userAgentType.value = settings.userAgentType;
    customUA.value = settings.customUA;
    
    // 根据用户代理类型显示/隐藏自定义输入框
    if (settings.userAgentType === 'custom') {
      customUAContainer.style.display = 'block';
    } else {
      customUAContainer.style.display = 'none';
    }
    
    // DNS设置
    enableCustomDNS.checked = settings.enableCustomDNS;
    dnsProvider.value = settings.dnsProvider || 'system';
    customDNS.value = settings.customDNS || '';
    
    // 根据DNS设置启用/禁用控件
    dnsProvider.disabled = !settings.enableCustomDNS;
    customDNS.disabled = !settings.enableCustomDNS || dnsProvider.value !== 'custom';
    
    // 根据DNS提供商显示/隐藏自定义输入框
    if (dnsProvider.value === 'custom') {
      customDNSContainer.style.display = 'block';
    } else {
      customDNSContainer.style.display = 'none';
    }
    
    // 更新DNS描述
    if (enableCustomDNS.checked) {
      updateDNSDescription();
    } else {
      dnsDescription.textContent = "禁用自定义DNS时，将使用系统默认DNS服务器。";
    }
    
    // 数据管理
    autoClear.checked = settings.autoClear;
  }
  
  // 显示通知
  function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // 3秒后自动消失
    setTimeout(function() {
      notification.classList.add('fade-out');
      setTimeout(function() {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }
  
  // 监听来自后台脚本的消息
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'loadDNSConfig') {
      console.log("收到加载DNS配置的请求");
      loadDNSServers();
      sendResponse({success: true});
    }
    return true;
  });
}); 