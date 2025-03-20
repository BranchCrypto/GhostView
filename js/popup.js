// GhostView - 弹出窗口脚本

document.addEventListener('DOMContentLoaded', function() {
  console.log("弹出窗口已加载");
  
  // 添加弹窗通知样式
  addNotificationStyles();
  
  // 获取DOM元素
  const privacyToggle = document.getElementById('privacyToggle');
  const statusCircle = document.getElementById('statusCircle');
  const statusText = document.getElementById('statusText');
  const clearDataBtn = document.getElementById('clearDataBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const torStatus = document.getElementById('torStatus');
  const devToolsBtn = document.getElementById('devToolsBtn');
  
  // 特性状态元素
  const webrtcStatus = document.getElementById('webrtcStatus');
  const geoStatus = document.getElementById('geoStatus');
  const cookieStatus = document.getElementById('cookieStatus');
  const uaStatus = document.getElementById('uaStatus');
  const headerStatus = document.getElementById('headerStatus');
  
  // 重试次数
  let toggleRetryCount = 0;
  const MAX_RETRY = 2;
  
  // 初始化 - 检查当前状态
  checkPrivacyStatus();
  
  // 检查Tor代理状态
  checkTorConnection();
  
  // 监听开关变化
  privacyToggle.addEventListener('change', function() {
    togglePrivacyMode();
  });
  
  // 切换隐私模式
  function togglePrivacyMode() {
    const isActive = privacyToggle.checked;
    console.log("隐私模式开关切换为:", isActive);
    
    // 禁用开关防止重复点击
    privacyToggle.disabled = true;
    
    // 显示正在处理的状态
    statusText.textContent = isActive ? '正在启用隐私保护...' : '正在禁用隐私保护...';
    
    // 通知后台脚本切换隐私模式
    chrome.runtime.sendMessage({action: 'togglePrivacyMode', enabled: isActive}, function(response) {
      console.log("收到togglePrivacyMode响应:", response);
      
      // 处理Chrome扩展消息API的问题
      if (!response && chrome.runtime.lastError) {
        console.error("消息响应出错:", chrome.runtime.lastError);
        handleToggleError("浏览器扩展通信错误，请重试");
        return;
      }
      
      // 重新启用开关
      privacyToggle.disabled = false;
      
      if (response && response.success) {
        // 重置重试计数
        toggleRetryCount = 0;
        
        updateUI(response.isActive);
        privacyToggle.checked = response.isActive;
        
        // 如果启用了，检查Tor连接
        if (response.isActive) {
          // 检查Tor连接并显示连接状态
          if (response.torConnected === false) {
            showNotification('无法连接到Tor网络，隐私保护模式将在不使用代理的情况下运行', 'warning');
          }
          checkTorConnection();
        }
      } else {
        // 处理错误情况
        const errorMsg = response && response.error ? response.error : '切换隐私模式失败，请重试';
        handleToggleError(errorMsg);
      }
    });
  }
  
  // 处理切换错误
  function handleToggleError(errorMsg) {
    showNotification(errorMsg, 'warning');
    
    // 如果可以重试
    if (toggleRetryCount < MAX_RETRY) {
      toggleRetryCount++;
      console.log(`尝试重试切换操作(${toggleRetryCount}/${MAX_RETRY})...`);
      setTimeout(() => {
        // 恢复开关状态
        checkPrivacyStatus();
      }, 1000);
    } else {
      // 达到最大重试次数
      console.error("达到最大重试次数，放弃切换操作");
      // 恢复开关状态
      checkPrivacyStatus();
      // 重置重试计数
      toggleRetryCount = 0;
    }
  }
  
  // 检查隐私状态
  function checkPrivacyStatus() {
    chrome.runtime.sendMessage({action: 'getPrivacyStatus'}, function(response) {
      console.log("获取隐私模式状态:", response);
      
      if (!response && chrome.runtime.lastError) {
        console.error("获取状态出错:", chrome.runtime.lastError);
        showNotification('无法获取隐私模式状态', 'warning');
        return;
      }
      
      const isActive = response && response.isActive ? true : false;
      updateUI(isActive);
      privacyToggle.checked = isActive;
    });
  }
  
  // 清除浏览数据按钮点击
  clearDataBtn.addEventListener('click', function() {
    console.log("点击清除浏览数据按钮");
    chrome.runtime.sendMessage({action: 'clearBrowsingData'}, function(response) {
      console.log("收到clearBrowsingData响应:", response);
      if (response && response.success) {
        // 显示成功通知
        showNotification('浏览数据已清除');
      } else {
        // 显示错误通知
        const errorMsg = response && response.error ? response.error : '清除浏览数据失败';
        showNotification(errorMsg, 'warning');
      }
    });
  });
  
  // 设置按钮点击
  settingsBtn.addEventListener('click', function() {
    console.log("点击设置按钮");
    // 打开设置页面
    try {
      chrome.runtime.openOptionsPage();
    } catch (error) {
      console.error("打开设置页面失败:", error);
      window.open(chrome.runtime.getURL('options.html'));
    }
  });
  
  // 开发者工具按钮点击
  if (devToolsBtn) {
    devToolsBtn.addEventListener('click', function() {
      console.log("点击开发者工具按钮");
      // 在新标签页中打开开发者工具
      chrome.tabs.create({
        url: chrome.runtime.getURL('devtools.html')
      });
    });
  }
  
  // 更新UI显示
  function updateUI(isActive) {
    console.log("更新UI状态:", isActive);
    if (isActive) {
      statusCircle.classList.add('active');
      statusText.textContent = '隐私保护已启用';
      
      // 更新各功能状态
      webrtcStatus.textContent = '已启用';
      webrtcStatus.className = 'feature-status enabled';
      
      geoStatus.textContent = '已启用';
      geoStatus.className = 'feature-status enabled';
      
      cookieStatus.textContent = '已启用';
      cookieStatus.className = 'feature-status enabled';
      
      uaStatus.textContent = '已启用';
      uaStatus.className = 'feature-status enabled';
      
      headerStatus.textContent = '已启用';
      headerStatus.className = 'feature-status enabled';
    } else {
      statusCircle.classList.remove('active');
      statusText.textContent = '隐私保护已禁用';
      
      // 更新各功能状态
      webrtcStatus.textContent = '已禁用';
      webrtcStatus.className = 'feature-status disabled';
      
      geoStatus.textContent = '已禁用';
      geoStatus.className = 'feature-status disabled';
      
      cookieStatus.textContent = '已禁用';
      cookieStatus.className = 'feature-status disabled';
      
      uaStatus.textContent = '已禁用';
      uaStatus.className = 'feature-status disabled';
      
      headerStatus.textContent = '已禁用';
      headerStatus.className = 'feature-status disabled';
      
      // Tor状态
      torStatus.textContent = '未连接';
      torStatus.className = 'feature-status disabled';
    }
  }
  
  // 检查Tor连接
  function checkTorConnection() {
    console.log("检查Tor连接状态");
    chrome.runtime.sendMessage({action: 'checkTorConnection'}, function(response) {
      console.log("收到checkTorConnection响应:", response);
      
      if (!response && chrome.runtime.lastError) {
        console.error("检查Tor连接出错:", chrome.runtime.lastError);
        torStatus.textContent = '状态未知';
        torStatus.className = 'feature-status disabled';
        return;
      }
      
      if (response && response.connected) {
        torStatus.textContent = '已连接';
        torStatus.className = 'feature-status enabled';
      } else {
        torStatus.textContent = '未连接';
        torStatus.className = 'feature-status disabled';
      }
    });
  }
  
  // 显示通知信息
  function showNotification(message, type = 'info') {
    console.log("显示通知:", message, type);
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // 3秒后自动消失，对警告类型的通知显示时间更长
    const displayTime = type === 'warning' ? 5000 : 2000;
    
    setTimeout(function() {
      notification.classList.add('fade-out');
      setTimeout(function() {
        document.body.removeChild(notification);
      }, 300);
    }, displayTime);
  }
  
  // 添加通知样式
  function addNotificationStyles() {
    // 检查是否已存在通知样式
    if (document.getElementById('notification-styles')) {
      return;
    }
    
    const style = document.createElement('style');
    style.id = 'notification-styles';
    style.textContent = `
      .notification {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: #4ecca3;
        color: #1a1a2e;
        padding: 10px 20px;
        border-radius: 4px;
        font-weight: 600;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        z-index: 9999;
        animation: slideUp 0.3s ease;
        max-width: 280px;
        text-align: center;
      }
      
      .notification.warning {
        background-color: #ffcc00;
        color: #333;
      }
      
      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translate(-50%, 20px);
        }
        to {
          opacity: 1;
          transform: translate(-50%, 0);
        }
      }
      
      .notification.fade-out {
        opacity: 0;
        transition: opacity 0.3s ease;
      }
    `;
    document.head.appendChild(style);
  }
}); 