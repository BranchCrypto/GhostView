// GhostView - 开发者工具脚本

// 请求缓存
let capturedRequests = [];
let isMonitoring = false;
let currentFilter = 'all';
let selectedRequestId = null;

// DOM元素
const privacyStatus = document.getElementById('privacyStatus');
const statusText = document.getElementById('statusText');
const startMonitoringBtn = document.getElementById('startMonitoringBtn');
const clearRequestsBtn = document.getElementById('clearRequestsBtn');
const requestsTableBody = document.getElementById('requestsTableBody');
const filterButtons = document.querySelectorAll('.filter-button');
const requestDetails = document.getElementById('requestDetails');
const closeDetailsBtn = document.getElementById('closeDetailsBtn');
const emptyState = document.getElementById('emptyState');

// 状态显示元素
const privacyStatusText = document.getElementById('privacyStatusText');
const dnsStatusText = document.getElementById('dnsStatusText');
const dnsServersText = document.getElementById('dnsServersText');
const torStatusText = document.getElementById('torStatusText');

// 详情视图元素
const detailUrl = document.getElementById('detailUrl');
const detailMethod = document.getElementById('detailMethod');
const detailStatus = document.getElementById('detailStatus');
const detailType = document.getElementById('detailType');
const detailTime = document.getElementById('detailTime');
const requestHeaders = document.getElementById('requestHeaders');
const responseHeaders = document.getElementById('responseHeaders');

// 初始化 - 检查当前状态
function checkPrivacyStatus() {
  chrome.runtime.sendMessage({action: 'getPrivacyStatus'}, function(response) {
    if (response && response.isActive) {
      privacyStatus.classList.add('active');
      statusText.textContent = '隐私保护状态: 已启用';
      privacyStatusText.textContent = '已启用';
      privacyStatusText.className = 'status-value enabled';
    } else {
      privacyStatus.classList.remove('active');
      statusText.textContent = '隐私保护状态: 已禁用';
      privacyStatusText.textContent = '已禁用';
      privacyStatusText.className = 'status-value disabled';
    }
  });
  
  // 检查DNS状态
  checkDNSStatus();
  
  // 检查Tor连接状态
  checkTorStatus();
}

// 检查DNS状态
function checkDNSStatus() {
  chrome.runtime.sendMessage({action: 'getDNSStatus'}, function(response) {
    if (response) {
      if (response.enableCustomDNS) {
        dnsStatusText.textContent = '自定义DNS - ' + (response.dnsProvider || 'system');
        dnsStatusText.className = 'status-value enabled';
        
        // 显示DNS服务器
        if (response.dnsServers && response.dnsServers.length > 0) {
          dnsServersText.textContent = response.dnsServers.join(', ');
        } else {
          dnsServersText.textContent = '未配置';
          dnsServersText.className = 'status-value warning';
        }
      } else {
        dnsStatusText.textContent = '系统默认';
        dnsStatusText.className = 'status-value';
        dnsServersText.textContent = '使用系统默认';
        dnsServersText.className = 'status-value';
      }
    } else {
      dnsStatusText.textContent = '未知';
      dnsStatusText.className = 'status-value disabled';
      dnsServersText.textContent = '-';
      dnsServersText.className = 'status-value';
    }
  });
}

// 检查Tor连接状态
function checkTorStatus() {
  chrome.runtime.sendMessage({action: 'checkTorConnection'}, function(response) {
    if (response) {
      if (response.connected) {
        torStatusText.textContent = '已连接';
        torStatusText.className = 'status-value enabled';
      } else {
        torStatusText.textContent = '未连接';
        torStatusText.className = 'status-value disabled';
      }
    } else {
      torStatusText.textContent = '未知';
      torStatusText.className = 'status-value disabled';
    }
  });
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
  checkPrivacyStatus();
  updateRequestsTable();
  
  // 每10秒刷新一次状态
  setInterval(checkPrivacyStatus, 10000);
});

// 开始/停止监控按钮
startMonitoringBtn.addEventListener('click', function() {
  if (isMonitoring) {
    // 停止监控 - 发送消息到background.js而不是直接移除监听器
    chrome.runtime.sendMessage({action: 'stopRequestCapture'}, function(response) {
      if (response && response.success) {
        isMonitoring = false;
        startMonitoringBtn.textContent = '开始监控';
        showNotification('已停止监控网络请求');
      } else {
        showNotification('停止监控失败', 'error');
      }
    });
  } else {
    // 开始监控
    chrome.runtime.sendMessage({action: 'startRequestCapture'}, function(response) {
      if (response && response.success) {
        isMonitoring = true;
        startMonitoringBtn.textContent = '停止监控';
        showNotification('已开始监控网络请求');
      } else {
        showNotification('无法启动监控，请检查权限', 'error');
      }
    });
  }
});

// 清除记录按钮
clearRequestsBtn.addEventListener('click', function() {
  capturedRequests = [];
  updateRequestsTable();
  closeDetailsPanel();
  showNotification('已清除所有记录');
});

// 过滤按钮点击处理
filterButtons.forEach(function(button) {
  button.addEventListener('click', function() {
    // 移除当前激活的按钮
    filterButtons.forEach(function(btn) {
      btn.classList.remove('active');
    });
    
    // 添加激活类到当前按钮
    this.classList.add('active');
    
    // 更新过滤器
    currentFilter = this.getAttribute('data-filter');
    
    // 更新表格
    updateRequestsTable();
  });
});

// 关闭详情面板按钮
closeDetailsBtn.addEventListener('click', function() {
  closeDetailsPanel();
});

// 关闭详情面板
function closeDetailsPanel() {
  requestDetails.style.display = 'none';
  selectedRequestId = null;
  
  // 移除选中状态
  const selectedRow = document.querySelector('.request-table tr.selected');
  if (selectedRow) {
    selectedRow.classList.remove('selected');
  }
}

// 接收来自background的请求数据
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'newRequest') {
    // 添加新请求到缓存
    capturedRequests.unshift(request.requestData);
    
    // 限制最大记录数量为500条
    if (capturedRequests.length > 500) {
      capturedRequests = capturedRequests.slice(0, 500);
    }
    
    // 更新表格
    updateRequestsTable();
    
    // 回复确认
    sendResponse({success: true});
    return true;
  }
});

// 更新请求表格
function updateRequestsTable() {
  // 清空表格
  requestsTableBody.innerHTML = '';
  
  // 过滤请求
  const filteredRequests = currentFilter === 'all' 
    ? capturedRequests 
    : capturedRequests.filter(req => {
        if (currentFilter === 'other') {
          const mainTypes = ['main_frame', 'script', 'stylesheet', 'image', 'xmlhttprequest'];
          return !mainTypes.includes(req.type);
        }
        return req.type === currentFilter;
      });
  
  // 检查是否有请求
  if (filteredRequests.length === 0) {
    emptyState.style.display = 'block';
    return;
  } else {
    emptyState.style.display = 'none';
  }
  
  // 添加请求到表格
  filteredRequests.forEach(function(req) {
    const row = document.createElement('tr');
    
    // 如果是当前选中的请求，添加选中样式
    if (req.requestId === selectedRequestId) {
      row.classList.add('selected');
    }
    
    // 格式化URL为短格式
    let shortUrl = req.url;
    if (shortUrl.length > 60) {
      shortUrl = shortUrl.substring(0, 57) + '...';
    }
    
    // 创建表格单元格
    row.innerHTML = `
      <td>${formatTime(req.timeStamp)}</td>
      <td>${req.method}</td>
      <td title="${req.url}">${shortUrl}</td>
      <td>${formatRequestType(req.type)}</td>
      <td>${req.statusCode || '-'}</td>
    `;
    
    // 添加点击事件
    row.addEventListener('click', function() {
      // 移除其他行的选中状态
      const selectedRow = document.querySelector('.request-table tr.selected');
      if (selectedRow) {
        selectedRow.classList.remove('selected');
      }
      
      // 添加选中状态
      row.classList.add('selected');
      
      // 显示详情
      showRequestDetails(req);
    });
    
    requestsTableBody.appendChild(row);
  });
}

// 显示请求详情
function showRequestDetails(request) {
  selectedRequestId = request.requestId;
  
  // 设置基本信息
  detailUrl.textContent = request.url;
  detailMethod.textContent = request.method;
  detailStatus.textContent = request.statusCode || '未完成';
  detailType.textContent = formatRequestType(request.type);
  detailTime.textContent = new Date(request.timeStamp).toLocaleString();
  
  // 清空请求头和响应头容器
  requestHeaders.innerHTML = '';
  responseHeaders.innerHTML = '';
  
  // 添加请求类型标题
  const requestTypeTitle = document.createElement('div');
  requestTypeTitle.className = 'header-type-title';
  requestTypeTitle.innerHTML = `<strong>请求类型：${formatRequestType(request.type)}</strong>`;
  requestHeaders.appendChild(requestTypeTitle);
  
  // 添加请求头
  if (request.requestHeaders && request.requestHeaders.length > 0) {
    request.requestHeaders.forEach(function(header) {
      const headerItem = document.createElement('div');
      headerItem.className = 'header-item';
      headerItem.innerHTML = `<span class="header-name">${header.name}: </span><span>${header.value}</span>`;
      requestHeaders.appendChild(headerItem);
    });
  } else {
    requestHeaders.innerHTML += '<div class="header-item">无法获取请求头信息</div>';
  }
  
  // 添加响应类型标题
  const responseTypeTitle = document.createElement('div');
  responseTypeTitle.className = 'header-type-title';
  responseTypeTitle.innerHTML = `<strong>响应类型：${request.contentType || '未知'}</strong>`;
  responseHeaders.appendChild(responseTypeTitle);
  
  // 添加状态码信息
  const statusInfo = document.createElement('div');
  statusInfo.className = 'header-item status-info';
  statusInfo.innerHTML = `<span class="header-name">状态码: </span><span>${request.statusCode || '-'} ${request.statusText || ''}</span>`;
  responseHeaders.appendChild(statusInfo);
  
  // 添加响应头
  if (request.responseHeaders && request.responseHeaders.length > 0) {
    request.responseHeaders.forEach(function(header) {
      const headerItem = document.createElement('div');
      headerItem.className = 'header-item';
      headerItem.innerHTML = `<span class="header-name">${header.name}: </span><span>${header.value}</span>`;
      responseHeaders.appendChild(headerItem);
      
      // 检测内容类型
      if (header.name.toLowerCase() === 'content-type') {
        const contentTypeEl = document.querySelector('.header-type-title:nth-child(1)');
        if (contentTypeEl) {
          contentTypeEl.innerHTML = `<strong>响应类型：${header.value}</strong>`;
        }
      }
    });
  } else {
    responseHeaders.innerHTML += '<div class="header-item">无法获取响应头信息或请求未完成</div>';
  }
  
  // 显示详情面板
  requestDetails.style.display = 'block';
}

// 格式化时间
function formatTime(timestamp) {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const milliseconds = date.getMilliseconds().toString().padStart(3, '0');
  
  return `${hours}:${minutes}:${seconds}.${milliseconds}`;
}

// 格式化请求类型
function formatRequestType(type) {
  const typeMap = {
    'main_frame': '主框架',
    'sub_frame': '子框架',
    'stylesheet': '样式表',
    'script': '脚本',
    'image': '图片',
    'font': '字体',
    'object': '对象',
    'xmlhttprequest': 'XHR',
    'ping': 'Ping',
    'csp_report': 'CSP报告',
    'media': '媒体',
    'websocket': 'WebSocket',
    'other': '其他'
  };
  
  return typeMap[type] || type;
}

// 显示通知
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
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