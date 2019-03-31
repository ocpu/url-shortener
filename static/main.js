const form = document.querySelector('form')

const $result = document.createElement('div')
form.appendChild($result)

const setResultValue = value => {
  const $a = document.createElement('a')
  if (value)
    $a.href = '/' + value
  $a.appendChild(document.createTextNode(value ? 'https://s.ocpu.me/' + value : 'Result'))
  if ($result.firstChild)
    $result.replaceChild($a, $result.firstChild)
  else
    $result.appendChild($a)
}

setResultValue()

form.addEventListener('submit', e => {
  e.preventDefault()
  const url = e.target['url'].value
  fetch('/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'url=' + encodeURIComponent(url)
  })
    .then(() => fetch('/result?type=json&url=' + encodeURIComponent(url)))
    .then(res => res.json())
    .then(({ res }) => setResultValue(res))
    .catch(console.error)
})
