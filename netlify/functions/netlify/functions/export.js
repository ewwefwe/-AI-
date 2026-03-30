const fs = require('fs');
const path = require('path');

// 数据文件路径
const dataDir = path.join(__dirname, '..', '..', 'data');
const eventsFile = path.join(dataDir, 'events.json');
const usersFile = path.join(dataDir, 'users.json');

// 导出数据
function exportData() {
  try {
    // 读取事件数据
    let events = [];
    if (fs.existsSync(eventsFile)) {
      const eventsData = fs.readFileSync(eventsFile, 'utf8');
      events = JSON.parse(eventsData);
    }
    
    // 读取用户数据
    let users = [];
    if (fs.existsSync(usersFile)) {
      const usersData = fs.readFileSync(usersFile, 'utf8');
      users = JSON.parse(usersData);
    }
    
    return {
      events: events,
      users: users,
      exportTime: new Date().toISOString()
    };
  } catch (error) {
    console.error('导出数据失败:', error);
    return {
      events: [],
      users: [],
      exportTime: new Date().toISOString(),
      error: error.message
    };
  }
}

// Netlify函数处理程序
exports.handler = async (event, context) => {
  try {
    // 导出数据
    const exportData = exportData();
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        success: true,
        data: exportData
      })
    };
  } catch (error) {
    console.error('处理请求失败:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        success: false,
        message: '服务器内部错误'
      })
    };
  }
};
