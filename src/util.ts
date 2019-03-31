export function log(marker: string, ...message: any) {
  const date = new Date
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hour = date.getHours().toString().padStart(2, '0')
  const minute = date.getMinutes().toString().padStart(2, '0')
  const second = date.getSeconds().toString().padStart(2, '0')
  
  const appendix = typeof message[0] === 'string' && message[0].includes('%s') ? ' ' + message.shift() : ''
  
  console.log(
    '\x1b[90m%s-%s-%s %s:%s:%s \x1b[35m[%s]\x1b[0m:' + appendix,
    year, month, day, hour, minute, second, marker, ...message
  )
}
