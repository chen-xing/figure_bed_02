// 该文件用于api填写
const serviceId = getQueryString('serviceId')

// 调用接口获取设置页面已选的控件列表和用户填充数据
// eslint-disable-next-line no-undef
axios
  .get(`https://ttapi.tsign.cn/webserver/v3/api/doc-templates/${serviceId}/getTemplateFillData`)
  .then(res => {
    // res = {
    //   structComponents: [
    //     {
    //       key: '',
    //       type: 18,
    //       context: {
    //         label: '表格',
    //         required: false,
    //         style: {
    //           font: 1,
    //           fontSize: 18,
    //           textColor: '#000',
    //           bold: false,
    //           italic: false,
    //         },
    //         limit: null,
    //         options: null,
    //         defaultValue: `[
    //             { row: { column1: 'a', column2: 'b', column3: 'c', column4: 'd', column5: 'e' } },
    //             { row: { column1: '1', column2: '', column3: '2', column4: '3', column5: '4' } },
    //             { row: { column3: '5', column5: '6' } },
    //             { row: { column3: '7', column4: '8', column5: '9' } },
    //             { row: { column1: '10', column2: '11', column3: '12', column5: '13' } },
    //           ]`,
    //         ext: '{"elementId":"element-1648876102460"}',
    //         pos: {
    //           x: 1,
    //           y: 1,
    //         }, // 后端底层会校验数据，先绕开
    //       },
    //     },
    //     {
    //       key: '',
    //       type: 16,
    //       context: {
    //         label: '身份证',
    //         required: true,
    //         style: {
    //           font: 1,
    //           fontSize: 18,
    //           textColor: '#000',
    //           bold: false,
    //           italic: false,
    //         },
    //         limit: null,
    //         options: null,
    //         defaultValue: '',
    //         ext: '{"elementId":"element-1649228192818"}',
    //         pos: {
    //           x: 1,
    //           y: 1,
    //         }, // 后端底层会校验数据，先绕开
    //       },
    //     },
    //   ],
    //   fillData: [
    //     {
    //       structId: 'element-1648876102460',
    //       value: JSON.stringify([
    //         { isInsert: true, row: { column3: '9985', column4: '9986' } },
    //         { row: { column1: 'a', column2: 'b', column3: 'c', column4: 'd', column5: 'e' } },
    //         { isInsert: true, row: { column1: '001', column2: '002', column3: '003', column4: '004', column5: '005' } },
    //         { isInsert: true, row: { column1: '101', column2: '102', column3: '103', column4: '104', column5: '105' } },
    //         { row: { column1: '1', column3: '2', column4: '3', column5: '4' } },
    //         { row: { column3: '5', column5: '6' } },
    //         { isInsert: true, row: { column3: '85', column5: '86' } },
    //         { row: { column3: '7', column4: '8', column5: '9' } },
    //         { isInsert: true, row: { column3: '985', column4: '986' } },
    //         { row: { column1: '10', column2: '11', column3: '12', column5: '13' } },
    //         { isInsert: true, row: { column3: '9985', column4: '9986' } },
    //         { isInsert: true, row: { column3: '89985', column4: '89986' } },
    //       ]),
    //     },
    //     {
    //       structId: 'element-1649228192818',
    //       value: '350312199203124857',
    //     },
    //   ],
    // }

    // 整合数据
    const { structComponents, fillData } = res
    const data = structComponents.forEach(item => {
      const extObj = JSON.parse(item.context.ext || '{}')
      if (extObj) {
        const structId = extObj.elementId
        const { hideTHeader, selectLayout, tableMatrix } = extObj
        const { font, fontSize, textColor, bold, italic } = item.context.style || {}
        const fillDataItem = fillData.find(item => item.structId === structId)

        return {
          ...item,
          ...fillDataItem,
          hideTHeader,
          font,
          fontSize,
          textColor,
          bold,
          italic,
          selectLayout,
          tableMatrix,
        }
      }
    })
    console.log('---data', data)

    // 遍历控件列表，填充值
    data.forEach(item => {
      let value = item.value || item.defaultValue

      // 找到dom元素
      const $el = document.querySelector(`#${item.structId}`)
      if (!(value && $el)) return

      // 如果是表格或者多选，需要将value从字符串转为数组
      if (item.type === 18 || item.type === 9) {
        value = JSON.parse(value)
      }

      // 隐藏签署区
      if (item.type === 6 || item.type === 17) {
        $el.style.display = 'none'

        return
      }

      // 图片
      if (item.type === 11) {
        $el.innerHTML = `<img width="100%" height="100%" src=${value} />`

        return
      }

      // 单选且非下拉形式
      if (item.type === 10 && item.selectLayout !== 'select') {
        const $element = document.querySelector(`#${item.structId} #${value}`)
        if ($element) {
          $element.checked = true
        }

        return
      }

      // 多选
      if (item.type === 9) {
        value.forEach(it => {
          const $element = document.querySelector(`#${item.structId} #${it}`)
          if ($element) {
            $element.checked = true
          }
        })

        return
      }

      // 身份证号
      if (item.type === 16) {
        $el.children && Array.from($el.children).map((item, index) => (item.innerHTML = value[index]))

        return
      }

      // 表格(数据及样式)
      if (item.type === 18) {
        const { tableMatrix } = item

        // 1. 先填充表格矩阵
        const originalRows = value.filter(item => !item.isInsert)

        // 1.1 处理原有的行
        // 记录列数
        const colLength = tableMatrix[0].length
        for (let i = 0; i < tableMatrix.length; i++) {
          const { row } = originalRows[i]
          for (let j = 0; j < colLength; j++) {
            // 上面和左边没有相同的groupId且原先没有值，才填充
            if (!sameWithTopOrLeft(tableMatrix, i, j) && !tableMatrix[i][j].val) {
              tableMatrix[i][j].val = row[`column${j + 1}`]
            }
          }
        }
        console.table('处理原有行：', tableMatrix)

        // 1.2 处理新插入的行
        for (let k = 0; k < tableMatrix.length + 1; k++) {
          if (value[k] && value[k].isInsert) {
            // 向原数组插入行
            tableMatrix.splice(k, 0, [])
            for (let t = 0; t < colLength; t++) {
              // 如果其上下groupId相应，则继承
              if (
                k > 1 &&
                k < colLength - 1 &&
                !!tableMatrix[k - 1][t].groupId &&
                tableMatrix[k - 1][t].groupId === tableMatrix[k + 1][t].groupId
              ) {
                tableMatrix[k][t] = {
                  groupId: tableMatrix[k - 1][t].groupId,
                }
              } else if (k > 1 && !!tableMatrix[k - 1][t].groupId) {
                // 继承上面行的规则
                tableMatrix[k][t] = {
                  groupId: tableMatrix[k - 1][t].groupId,
                }
              } else {
                // 使用插入的值
                tableMatrix[k][t] = {
                  val: value[k].row[`column${t + 1}`],
                }
              }
            }
          }
        }
        console.table('处理新增行：', tableMatrix)

        // 2. 再生成新的table
        const $table = document.createElement('table')
        for (let r = 0; r < tableMatrix.length; r++) {
          let newRow = $table.insertRow(r)

          // 如果不隐藏表头则添加thead
          if (!item.hideTHeader && r === 0) {
            const head = $table.createTHead()
            newRow = head.insertRow(r)
            head.setAttribute('style', 'background:#F2F3F5;')
          }
          let cellIndex = 0
          for (let s = 0; s < colLength; s++) {
            if (!sameWithTopOrLeft(tableMatrix, r, s)) {
              // 该行里面找所有一样的groupId，得出colspan
              const colspan = tableMatrix[r].filter(item => !!tableMatrix[r][s].groupId && item.groupId === tableMatrix[r][s].groupId)
                .length

              // 该列里找所有一样的groupId，得出rowspan
              const rowspan = getRowSpan(r, s, tableMatrix)
              const newCell = newRow.insertCell(cellIndex++)
              rowspan > 0 && newCell.setAttribute('rowspan', rowspan)
              colspan > 0 && newCell.setAttribute('colspan', colspan)
              newCell.setAttribute('style', 'border: 1px solid #ccc;width:200px;')

              // 有内容则用原先的，否则填充
              if (tableMatrix[r][s].innerHTML) {
                newCell.innerHTML = tableMatrix[r][s].innerHTML
              } else {
                const newText = document.createTextNode(tableMatrix[r][s].val || '')
                newCell.appendChild(newText)
              }

              // 原先如果有td样式则要应用
              if (tableMatrix[r][s].tdStyle) {
                newCell.setAttribute('style', `${tableMatrix[r][s].tdStyle};border:1px solid #ddd`)
              } else {
                newCell.style.border = '1px solid #ddd'
              }
            }
          }
          console.log('newRow:', newRow)
        }

        // 设置表格样式
        $table.setAttribute(
          'style',
          `border:none; border-collapse:collapse; empty-cells:show; width: 100%;font-family:${fontFamilyObj[item.font]};font-size:${
            item.fontSize
          }pt;color:${item.textColor};`
        )
        if (item.bold) {
          $table.style.fontWeight = 'bold'
        }
        if (item.italic) {
          $table.style.fontStyle = 'italic'
        }
        $el.innerHTML = $table

        return
      }

      // 文本、数字、手机号、日期、下拉框
      $el.innerHTML = value
    })
  })
  .catch(error => {
    console.log(error)
  })

// 1-宋体，2-新宋体,3-微软雅黑,4-黑体,5-楷体
const fontFamilyObj = {
  1: 'SimSun',
  2: 'NSimSun',
  4: 'SimHei',
  5: 'KaiTi',
}

function sameWithTopOrLeft(tableMatrix, i, j) {
  return (
    (i >= 1 && !!tableMatrix[i][j].groupId && tableMatrix[i][j].groupId === tableMatrix[i - 1][j].groupId) ||
    (j >= 1 && !!tableMatrix[i][j].groupId && tableMatrix[i][j].groupId === tableMatrix[i][j - 1].groupId)
  )
}

function getRowSpan(row, col, tableMatrix) {
  let cols = 0

  // 遍历所有行的该列
  for (let i = 0; i < tableMatrix.length; i++) {
    if (!!tableMatrix[row][col].groupId && tableMatrix[i][col].groupId === tableMatrix[row][col].groupId) {
      cols++
    }
  }

  return cols
}

function getQueryString(name) {
  const reg = new RegExp(`(^|&)${name}=([^&]*)(&|$)`)
  const r = window.location.search.substr(1).match(reg)
  if (r != null) return unescape(r[2])

  return null
}
