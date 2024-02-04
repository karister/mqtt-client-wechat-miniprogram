import mqtt from "../../utils/mqtt.min.js";

Page({
  data: {
    connectStatus: false,
    connectStatusText: "未连接",
    connectStatusTextClass: "disconnect-text",
    connectStatusIconClass: "disconnect-icon",

    wifiInfo: {}, // 用于存放 WiFi 信息

    dataPointList: [ // 数据点信息
      {
        type: "data", 
        name: "温度",
        value: "20",
        filed: "temp",
        unit: "°C"
      },
      {
        type: "data",
        name: "湿度",
        value: "47",
        filed: "humi",
        unit: "%"
      },
      {
        type: "switch",
        name: "灯光",
        value: true,
        filed: "led"
      },
      {
        type: "switch",
        name: "窗户",
        value: false,
        filed: "window"
      },
      {
        type: "slider",
        name: "亮度",
        value: 50,
        filed: "brightness"
      },
    ],

    client: null,
    conenctBtnText: "连接",
    // host: "wx.emqxcloud.cn",
    // subTopic: "testtopic/miniprogram",
    // pubTopic: "testtopic/miniprogram",
    // pubMsg: "Hello! I am from WeChat miniprogram",
    // receivedMsg: "",
    // mqttOptions: {
    //   username: "test",
    //   password: "test",
    host: "b161900c.cn-hangzhou.emqx.cloud",
    subTopic: "yuqing/miniprogram",
    pubTopic: "yuqing/miniprogram",
    pubMsg: "{\"temp\": \"28\"}",
    receivedMsg: "",
    mqttOptions: {
      username: "wechat",
      password: "wechat",
      reconnectPeriod: 1000, // 1000毫秒，设置为 0 禁用自动重连，两次重新连接之间的间隔时间
      connectTimeout: 30 * 1000, // 30秒，连接超时时间
      // 更多参数请参阅 MQTT.js 官网文档：https://github.com/mqttjs/MQTT.js#mqttclientstreambuilder-options
      // 更多 EMQ 相关 MQTT 使用教程可在 EMQ 官方博客中进行搜索：https://www.emqx.com/zh/blog
    },
  },

  setValue(key, value) {
    this.setData({
      [key]: value,
    });
  },
  setHost(e) {
    this.setValue("host", e.detail.value);
  },
  setSubTopic(e) {
    this.setValue("subTopic", e.detail.value);
  },
  setPubTopic(e) {
    this.setValue("pubTopic", e.detail.value);
  },
  setPubMsg(e) {
    this.setValue("pubMsg", e.detail.value);
  },
  setRecMsg(msg) {
    this.setValue("receivedMsg", msg);
  },

  onLoad: function () {
    // 启用 WiFi 功能
    // this.startWifi();

    // 获取当前连接的 WiFi 信息
    // this.getConnectedWifiInfo();
  },

  startWifi: function () {
    wx.startWifi({
      success: (res) => {
        console.log('启用 WiFi 功能成功', res);
      },
      fail: (error) => {
        console.error('启用 WiFi 功能失败', error);
      },
    });
  },
  getConnectedWifiInfo: function () {
    wx.getConnectedWifi({
      success: (res) => {
        const wifiInfo = res.wifi;
        console.log('WIFI 信息', wifiInfo);
        this.setData({
          wifiInfo: wifiInfo,
        });
      },
      fail: (error) => {
        console.error('获取当前连接的 WiFi 信息失败', error);
      },
    });
  },

  message_received_callback(topic, payload) {
    console.log('message_received_callback! payload is: ', payload.toString());
    const jsonPayload = JSON.parse(payload.toString());
    for (const dataPoint of this.data.dataPointList) {
      const field = dataPoint.filed;
      if (jsonPayload.hasOwnProperty(field)) {
        // 更新数据点的值
        dataPoint.value = jsonPayload[field];
        console.log(dataPoint.filed,":", dataPoint.value);
      }
    }
    // 更新页面数据
    this.setData({
      dataPointList: this.data.dataPointList
    });
    const currMsg = this.data.receivedMsg ? `<br/>${payload}` : payload;
    this.setValue("receivedMsg", this.data.receivedMsg.concat(currMsg));
  },

  connect() {
    // MQTT-WebSocket 统一使用 /path 作为连接路径，连接时需指明，但在 EMQX Cloud 部署上使用的路径为 /mqtt
    // 因此不要忘了带上这个 /mqtt !!!
    // 微信小程序中需要将 wss 协议写为 wxs，且由于微信小程序出于安全限制，不支持 ws 协议
    try {
      wx.showLoading({
        title: '连接中',
      })
      this.setValue("conenctBtnText", "连接中...");
      const clientId = new Date().getTime();
      this.data.client = mqtt.connect(`wxs://${this.data.host}:8084/mqtt`, {
        ...this.data.mqttOptions,
        clientId,
      });

      this.data.client.on("connect", () => {
        wx.hideLoading()
        wx.showToast({
          title: "连接成功",
        });
        this.setConnectStatus(true);

        this.subscribe();

        this.data.client.on("message", (topic, payload) => {
          this.message_received_callback(topic, payload)
        });

        this.data.client.on("reconnect", () => {
          this.setConnectStatus(false);
          console.log("reconnecting...");
        });

        this.data.client.on("offline", () => {
          this.setConnectStatus(false);
          console.log("onOffline");
        });
        // 更多 MQTT.js 相关 API 请参阅 https://github.com/mqttjs/MQTT.js#api
      });
    } catch (error) {
      this.setValue("conenctBtnText", "连接");
      this.setConnectStatus(false);
    }
  },

  subscribe() {
    if (this.data.client) {
      this.data.client.subscribe(this.data.subTopic);
      // wx.showModal({
      //   content: `成功订阅主题：${this.data.subTopic}`,
      //   showCancel: false,
      // });
      return;
    }
    wx.showToast({
      title: "请先点击连接",
      icon: "error",
    });
  },

  unsubscribe() {
    if (this.data.client) {
      this.data.client.unsubscribe(this.data.subTopic);
      wx.showModal({
        content: `成功取消订阅主题：${this.data.subTopic}`,
        showCancel: false,
      });
      return;
    }
    wx.showToast({
      title: "请先点击连接",
      icon: "error", 
    });
  },

  publish(msg) {
    if (this.data.client) {
      this.data.client.publish(this.data.pubTopic, msg);
      return;
    }
    wx.showToast({
      title: "请先点击连接",
      icon: "error",
    });
  },

  disconnect() {
    this.data.client.end();
    this.data.client = null;
    this.setConnectStatus(false);
    this.setValue("receivedMsg", "");
    wx.showToast({
      title: "成功断开连接",
    });
  },

  setConnectStatus(status) {
    if (status) {
      console.log("status: " + status);
      this.setData({
        "conenctBtnText": "连接成功",
        "connectStatus": true,
        "connectStatusText": "已连接",
        "connectStatusTextClass": "connected-text",
        "connectStatusIconClass": "connected-icon",
      })
    } else {
      console.log("status: " + status);
      this.setData({
        "conenctBtnText": "未连接",
        "connectStatus": false,
        "connectStatusText": "未连接",
        "connectStatusTextClass": "disconnect-text",
        "connectStatusIconClass": "disconnect-icon"
      })
    }
  },

  switchChange(event) {
     // 获取当前 switch 组件的索引
     const index = event.currentTarget.dataset.index;

     // 获取当前 switch 的值
     const switchValue = event.detail.value;
 
     // 更新 dataPointList 中对应项的值
     this.setData({
       [`dataPointList[${index}].value`]: switchValue
     });

     // 推送更新的数据
     const updateJsonStr = JSON.stringify({
      [this.data.dataPointList[index].filed]: switchValue
    });
    console.log('changed:', updateJsonStr);
    this.publish(updateJsonStr);
 
     // 打印更新后的数据
     console.log('Switch changed:', this.data.dataPointList);
  },

  sliderChange(event) {
    const index = event.currentTarget.dataset.index;
    const sliderValue = event.detail.value;

    // 构建更新的 JSON 对象
    const updateObject = {
      [this.data.dataPointList[index].filed]: sliderValue
    };

    // 转换为 JSON 字符串（如果需要字符串格式）
    const updateJsonStr = JSON.stringify(updateObject);

    // 更新 dataPointList 中对应项的值
    this.setData({
      [`dataPointList[${index}].value`]: sliderValue
    });

    // 调用推送逻辑，并将更新的 JSON 对象传入
    this.publish(updateJsonStr);
  },
});
