// 数据收集函数
function trackEvent(eventName, data) {
    // 构建事件数据
    const eventData = {
        event: eventName,
        data: data,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        screenSize: `${window.screen.width}x${window.screen.height}`
    };
    
    // 存储到本地存储
    let events = JSON.parse(localStorage.getItem('agrisens_events') || '[]');
    events.push(eventData);
    // 限制存储数量，最多存储1000条
    if (events.length > 1000) {
        events = events.slice(-1000);
    }
    localStorage.setItem('agrisens_events', JSON.stringify(events));
    
    console.log('Tracked event:', eventName, data);
}

// 导出数据函数
function exportEvents() {
    const events = localStorage.getItem('agrisens_events');
    if (events) {
        // 创建下载链接
        const blob = new Blob([events], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `agrisens_events_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// 添加导出数据按钮
function addExportButton() {
    const button = document.createElement('button');
    button.textContent = '导出数据';
    button.style.position = 'fixed';
    button.style.bottom = '20px';
    button.style.right = '20px';
    button.style.padding = '10px';
    button.style.backgroundColor = '#4CAF50';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '5px';
    button.style.cursor = 'pointer';
    button.onclick = exportEvents;
    document.body.appendChild(button);
}

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 初始化所有功能
    initFeatureCards();
    initCropManual();
    initWeather();
    initDiseaseIdentification();
    initCropRecommendation();
    initFertilizerRecommendation();
    
    // 添加导出数据按钮
    addExportButton();
    
    // 跟踪页面加载事件
    trackEvent('page_load', { page: 'home' });
});

// 初始化功能卡片点击事件
function initFeatureCards() {
    const featureCards = document.querySelectorAll('.feature-card');
    featureCards.forEach(card => {
        card.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            // 跟踪功能卡片点击事件
            trackEvent('feature_card_click', { target: targetId, text: this.querySelector('h3').textContent });
            document.querySelector(targetId).scrollIntoView({ behavior: 'smooth' });
        });
    });
}

// 初始化作物手册功能
function initCropManual() {
    const cropSelect = document.getElementById('crop-select');
    const cropGuide = document.getElementById('crop-guide');
    
    // 从后端API获取作物列表
    fetch('http://localhost:3001/api/crop-manual/crops')
        .then(response => {
            if (!response.ok) {
                throw new Error('后端服务不可用');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // 清空下拉菜单
                cropSelect.innerHTML = '<option value="">请选择作物</option>';
                // 添加作物选项
                data.data.forEach(crop => {
                    const option = document.createElement('option');
                    option.value = crop.value;
                    option.textContent = crop.label;
                    cropSelect.appendChild(option);
                });
            } else {
                cropSelect.innerHTML = '<option value="">获取作物列表失败</option>';
            }
        })
        .catch(error => {
            cropSelect.innerHTML = '<option value="">后端服务不可用，请稍后重试</option>';
            console.error('Error fetching crops:', error);
        });
    
    // 监听作物选择变化
    cropSelect.addEventListener('change', function() {
        const crop = this.value;
        // 跟踪作物选择事件
        trackEvent('crop_select', { crop: crop });
        
        if (crop) {
            // 显示加载状态
            cropGuide.innerHTML = '<div class="loading"></div>';
            
            // 从后端API获取作物指南
            fetch(`http://localhost:3001/api/crop-manual/${crop}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('后端服务不可用');
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        const guide = data.data;
                        cropGuide.innerHTML = `
                            <h3>${guide.name}种植指南</h3>
                            <p><strong>种植时间：</strong>${guide.planting}</p>
                            <p><strong>浇水管理：</strong>${guide.watering}</p>
                            <p><strong>施肥管理：</strong>${guide.fertilization}</p>
                            <p><strong>病虫害防治：</strong>${guide.pests}</p>
                            <p><strong>收获时间：</strong>${guide.harvest}</p>
                        `;
                        // 跟踪作物指南获取成功事件
                        trackEvent('crop_guide_success', { crop: crop, guide_name: guide.name });
                    } else {
                        cropGuide.innerHTML = '获取作物指南失败，请稍后重试';
                        // 跟踪作物指南获取失败事件
                        trackEvent('crop_guide_failure', { crop: crop, error: data.message });
                    }
                })
                .catch(error => {
                    cropGuide.innerHTML = '后端服务不可用，请稍后重试';
                    console.error('Error fetching crop guide:', error);
                    // 跟踪作物指南获取错误事件
                    trackEvent('crop_guide_error', { crop: crop, error: error.message });
                });
        } else {
            cropGuide.innerHTML = '请选择作物查看种植指南';
        }
    });
}

// 初始化天气查询功能
function initWeather() {
    const weatherBtn = document.getElementById('weather-btn');
    const cityInput = document.getElementById('city-input');
    const weatherResult = document.getElementById('weather-result');
    
    weatherBtn.addEventListener('click', function() {
        const city = cityInput.value.trim();
        if (!city) {
            weatherResult.innerHTML = '请输入城市名称';
            // 跟踪天气查询空输入事件
            trackEvent('weather_query_empty');
            return;
        }
        
        // 跟踪天气查询事件
        trackEvent('weather_query', { city: city });
        
        // 显示加载动画
        weatherResult.innerHTML = '<div class="loading"></div>';
        
        // 禁用按钮，防止重复提交
        weatherBtn.disabled = true;
        weatherBtn.textContent = '查询中...';
        
        // 调用后端API
        fetch(`http://localhost:3001/api/weather?city=${city}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('后端服务不可用');
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    // 生成天气结果HTML
                    let weatherHTML = `<h3>${data.data.city}未来7天天气</h3>`;
                    data.data.weather.forEach(day => {
                        weatherHTML += `
                            <div class="weather-item">
                                <div class="date">${day.date}</div>
                                <img src="http://openweathermap.org/img/wn/${day.icon}.png" alt="${day.description}">
                                <div class="temp">${day.temp}°C</div>
                                <div class="desc">${day.description}</div>
                            </div>
                        `;
                    });
                    weatherResult.innerHTML = weatherHTML;
                    // 跟踪天气查询成功事件
                    trackEvent('weather_query_success', { city: city, result_city: data.data.city });
                } else {
                    weatherResult.innerHTML = data.message || '城市未找到，请检查输入';
                    // 跟踪天气查询失败事件
                    trackEvent('weather_query_failure', { city: city, error: data.message });
                }
            })
            .catch(error => {
                weatherResult.innerHTML = '后端服务不可用，请稍后重试';
                console.error('Error fetching weather data:', error);
                // 跟踪天气查询错误事件
                trackEvent('weather_query_error', { city: city, error: error.message });
            })
            .finally(() => {
                // 恢复按钮状态
                weatherBtn.disabled = false;
                weatherBtn.textContent = '查询';
            });
    });
}

// 初始化病虫害识别功能
function initDiseaseIdentification() {
    const identifyBtn = document.getElementById('identify-btn');
    const imageUpload = document.getElementById('image-upload');
    const diseaseResult = document.getElementById('disease-result');
    
    // 图片预览功能
    imageUpload.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            // 验证文件类型
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
            if (!allowedTypes.includes(file.type)) {
                diseaseResult.innerHTML = '请上传JPG、PNG或GIF格式的图片';
                return;
            }
            
            // 验证文件大小
            if (file.size > 5 * 1024 * 1024) { // 5MB限制
                diseaseResult.innerHTML = '图片大小不能超过5MB';
                return;
            }
            
            const reader = new FileReader();
            reader.onload = function(e) {
                const preview = document.createElement('img');
                preview.id = 'image-preview';
                preview.src = e.target.result;
                
                // 清除之前的预览
                const oldPreview = document.getElementById('image-preview');
                if (oldPreview) {
                    oldPreview.remove();
                }
                
                // 添加新的预览
                imageUpload.parentElement.appendChild(preview);
                
                // 清除错误信息
                diseaseResult.innerHTML = '请上传叶片图片并点击识别';
            };
            reader.readAsDataURL(file);
        }
    });
    
    identifyBtn.addEventListener('click', function() {
        const file = imageUpload.files[0];
        if (!file) {
            diseaseResult.innerHTML = '请上传叶片图片';
            // 跟踪病虫害识别空上传事件
            trackEvent('disease_identify_empty');
            return;
        }
        
        // 跟踪病虫害识别事件
        trackEvent('disease_identify', { file_name: file.name, file_size: file.size, file_type: file.type });
        
        // 显示加载动画
        diseaseResult.innerHTML = '<div class="loading"></div>';
        
        // 禁用按钮，防止重复提交
        identifyBtn.disabled = true;
        identifyBtn.textContent = '识别中...';
        
        // 创建FormData对象
        const formData = new FormData();
        formData.append('image', file);
        
        // 调用后端API
        fetch('http://localhost:3001/api/disease/identify', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('后端服务不可用');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                const disease = data.data.disease;
                diseaseResult.innerHTML = `
                    <div class="disease-result">
                        <h3>识别结果</h3>
                        <h4>${disease.name}</h4>
                        <p><strong>病害描述：</strong>${disease.description}</p>
                        <p><strong>防治方案：</strong>${disease.treatment}</p>
                    </div>
                `;
                // 跟踪病虫害识别成功事件
                trackEvent('disease_identify_success', { disease_name: disease.name });
            } else {
                diseaseResult.innerHTML = data.message || '识别失败，请重试';
                // 跟踪病虫害识别失败事件
                trackEvent('disease_identify_failure', { error: data.message });
            }
        })
        .catch(error => {
            diseaseResult.innerHTML = '后端服务不可用，请稍后重试';
            console.error('Error identifying disease:', error);
            // 跟踪病虫害识别错误事件
            trackEvent('disease_identify_error', { error: error.message });
        })
        .finally(() => {
            // 恢复按钮状态
            identifyBtn.disabled = false;
            identifyBtn.textContent = '识别';
        });
    });
}

// 初始化作物推荐功能
function initCropRecommendation() {
    const recommendBtn = document.getElementById('recommend-btn');
    const nitrogen = document.getElementById('nitrogen');
    const phosphorus = document.getElementById('phosphorus');
    const potassium = document.getElementById('potassium');
    const ph = document.getElementById('ph');
    const recommendResult = document.getElementById('recommend-result');
    
    recommendBtn.addEventListener('click', function() {
        // 获取输入值
        const n = parseFloat(nitrogen.value) || 0;
        const p = parseFloat(phosphorus.value) || 0;
        const k = parseFloat(potassium.value) || 0;
        const soilPh = parseFloat(ph.value) || 7;
        
        // 验证输入值
        if (n < 0 || n > 5) {
            recommendResult.innerHTML = '氮含量应在0-5%之间';
            return;
        }
        if (p < 0 || p > 5) {
            recommendResult.innerHTML = '磷含量应在0-5%之间';
            return;
        }
        if (k < 0 || k > 5) {
            recommendResult.innerHTML = '钾含量应在0-5%之间';
            return;
        }
        if (soilPh < 4 || soilPh > 10) {
            recommendResult.innerHTML = 'pH值应在4-10之间';
            return;
        }
        
        // 显示加载动画
        recommendResult.innerHTML = '<div class="loading"></div>';
        
        // 禁用按钮，防止重复提交
        recommendBtn.disabled = true;
        recommendBtn.textContent = '推荐中...';
        
        // 调用后端API
        fetch('http://localhost:3001/api/crop-recommend', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nitrogen: n,
                phosphorus: p,
                potassium: k,
                ph: soilPh
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('后端服务不可用');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                const recommendedCrops = data.data.recommendedCrops;
                // 生成推荐结果
                let resultHTML = '<h3>推荐作物</h3>';
                if (recommendedCrops.length > 0) {
                    resultHTML += '<ul class="recommend-list">';
                    recommendedCrops.forEach(crop => {
                        resultHTML += `<li>${crop}</li>`;
                    });
                    resultHTML += '</ul>';
                } else {
                    resultHTML += '<p>根据土壤条件，暂无推荐作物</p>';
                }
                recommendResult.innerHTML = resultHTML;
            } else {
                recommendResult.innerHTML = data.message || '推荐失败，请重试';
            }
        })
        .catch(error => {
            recommendResult.innerHTML = '后端服务不可用，请稍后重试';
            console.error('Error recommending crops:', error);
        })
        .finally(() => {
            // 恢复按钮状态
            recommendBtn.disabled = false;
            recommendBtn.textContent = '推荐';
        });
    });
}

// 初始化施肥推荐功能
function initFertilizerRecommendation() {
    const fertilizerBtn = document.getElementById('fertilizer-btn');
    const targetCrop = document.getElementById('target-crop');
    const soilNitrogen = document.getElementById('soil-nitrogen');
    const soilPhosphorus = document.getElementById('soil-phosphorus');
    const soilPotassium = document.getElementById('soil-potassium');
    const soilPh = document.getElementById('soil-ph');
    const fertilizerResult = document.getElementById('fertilizer-result');
    
    fertilizerBtn.addEventListener('click', function() {
        const crop = targetCrop.value;
        const n = parseFloat(soilNitrogen.value) || 0;
        const p = parseFloat(soilPhosphorus.value) || 0;
        const k = parseFloat(soilPotassium.value) || 0;
        const ph = parseFloat(soilPh.value) || 7;
        
        if (!crop) {
            fertilizerResult.innerHTML = '请选择目标作物';
            return;
        }
        
        // 验证输入值
        if (n < 0 || n > 5) {
            fertilizerResult.innerHTML = '氮含量应在0-5%之间';
            return;
        }
        if (p < 0 || p > 5) {
            fertilizerResult.innerHTML = '磷含量应在0-5%之间';
            return;
        }
        if (k < 0 || k > 5) {
            fertilizerResult.innerHTML = '钾含量应在0-5%之间';
            return;
        }
        if (ph < 4 || ph > 10) {
            fertilizerResult.innerHTML = 'pH值应在4-10之间';
            return;
        }
        
        // 显示加载动画
        fertilizerResult.innerHTML = '<div class="loading"></div>';
        
        // 禁用按钮，防止重复提交
        fertilizerBtn.disabled = true;
        fertilizerBtn.textContent = '推荐中...';
        
        // 调用后端API
        fetch('http://localhost:3001/api/fertilizer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                crop: crop,
                nitrogen: n,
                phosphorus: p,
                potassium: k,
                ph: ph
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('后端服务不可用');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                const fertilizerPlan = data.data.fertilizerPlan;
                // 生成施肥推荐结果
                fertilizerResult.innerHTML = `
                    <h3>施肥推荐方案</h3>
                    <div class="fertilizer-plan">
                        <div class="fertilizer-item">
                            <h4>氮肥</h4>
                            <p>${fertilizerPlan.nitrogen.toFixed(1)} kg/亩</p>
                        </div>
                        <div class="fertilizer-item">
                            <h4>磷肥</h4>
                            <p>${fertilizerPlan.phosphorus.toFixed(1)} kg/亩</p>
                        </div>
                        <div class="fertilizer-item">
                            <h4>钾肥</h4>
                            <p>${fertilizerPlan.potassium.toFixed(1)} kg/亩</p>
                        </div>
                    </div>
                    <p><strong>pH值调节：</strong>${fertilizerPlan.phAdjustment}</p>
                `;
            } else {
                fertilizerResult.innerHTML = data.message || '推荐失败，请重试';
            }
        })
        .catch(error => {
            fertilizerResult.innerHTML = '后端服务不可用，请稍后重试';
            console.error('Error recommending fertilizer:', error);
        })
        .finally(() => {
            // 恢复按钮状态
            fertilizerBtn.disabled = false;
            fertilizerBtn.textContent = '推荐';
        });
    });
}
