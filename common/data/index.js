Component({
  properties: {
    // 这里定义了innerText属性，属性值可以在组件使用时指定
    name: {
      type: String,
      value: '温度',
    },
    value: {
      type: String,
      value: '25',
    }
  },
  methods: {
    // 这里是一个自定义方法
    customMethod: function(){}
  }
})