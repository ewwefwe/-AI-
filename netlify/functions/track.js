const fs = require('fs');
const path = require('path');

// 确保数据目录存在
const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 存储事件数据的文件路径
const eventsFile = path.join(dataDir, 'events.json');
const usersFile = path.join(dataDir, 'users.json');

// 存储事件数据
function storeEvent(eventData) {
  try {
    // 读取现有事件数据
    let events = [];
    if (fs.existsSync(eventsFile)) {
      const eventsData = fs.readFileSync(eventsFile, 'utf8');
      events = JSON.parse(eventsData);
    }
    
    // 添加新事件
    events.push(eventData);
    
    // 限制存储数量，最多存储1000条
    if (events.length > 1000) {
      events = events.slice(-1000);
    }
    
    // 写入文件
    fs.writeFileSync(eventsFile, JSON.stringify(events, null, 2));
    
    // 处理用户数据
    let users = [];
    if (fs.existsSync(usersFile)) {
      const usersData = fs.readFileSync(usersFile, 'utf8');
      users = JSON.parse(usersData);
    }
    
    const existingUser = users.find(user => user.user_id === eventData.user_id);
    if (!existingUser) {
      users.push({
        user_id: eventData.user_id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } else {
      existingUser.updatedAt = new Date().toISOString();
    }
    
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
    
    return true;
  } catch (error) {
    console.error('存储事件数据失败:', error);
    return false;
  }
}

// Netlify函数处理程序
exports.handler = async (event, context) => {
  try {
    // 解析请求体
    const eventData = JSON.parse(event.body);
    
    if (!eventData) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify({
          success: false,
          message: '请求数据为空'
        })
      };
    }
    
    // 存储事件数据
    const success = storeEvent(eventData);
    
    if (success) {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify({
          success: true,
          message: '数据收集成功'
        })
      };
    } else {
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify({
          success: false,
          message: '数据收集失败'
        })
      };
    }
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
