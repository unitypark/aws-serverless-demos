import '../css/result.css'

function Result(props) {
    const result = {
        URL: props.url,
        qrImageUrl: encodeURI(
            'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://swift-share.web.app/download/' +
                props.url
        ),
    }

    const share = () => {
        if (navigator.canShare) {
            navigator
                .share({
                    url: 'download/' + result.URL,
                    title: 'My Shared Files',
                    text:
                        'Please download these files using the code: ' +
                        result.URL +
                        ' at ',
                })
                .catch((error) => console.log('Sharing failed', error))
        } else {
            let a = document.createElement('a')
            a.setAttribute(
                'href',
                'whatsapp://send?text=Hii there, I am sharing some files with you. Download them using the code:  \n' +
                    result.URL +
                    '\n    at  https://swift-share.web.app/download/' +
                    result.URL
            )
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
        }
    }
    const copy = () => {
        let url = document.getElementById('copy').value
        window.navigator.clipboard.writeText(url)
        let alert = document.getElementById('alertResult')
        alert.style.display = 'block'
        alert.innerHTML = 'copied'
        setTimeout(function () {
            alert.style.display = 'none'
        }, 500)
    }
    return (
        <div className="Result">
            <img
                alt="scannable qr code"
                title="scannable qr code"
                src={result.qrImageUrl}
                width={'150px'}
                height={'150px'}
                style={{ marginBottom: '30px' }}
            />
            <div className="textbox">
                <input
                    type="text"
                    readOnly={true}
                    id="copy"
                    value={result.URL}
                />
                <button
                    onClick={share}
                    className="share"
                    style={{ outline: 'none' }}
                >
                    {' '}
                    <img
                        src={require('./image/file-share.png')}
                        alt="file share icon"
                        title="file share success"
                        style={{ backgroundColor: 'white' }}
                    />{' '}
                </button>
            </div>
            <p style={{ width: '80%', textAlign: 'center', marginTop: '20px' }}>
                <u>Note</u>: Directly enter the code in the downloads section or
                scan the QR Code to Download Your Files
            </p>
            <button
                onClick={copy}
                className="CopyButton"
                style={{ outline: 'none' }}
            >
                Copy
            </button>
            <img
                alt="file transfer sucessful"
                title="sucessful file transfer"
                src={require('./image/file-transfer-success.jpg')}
                width={'400px'}
            />
            <div color="success" id="alertResult"></div>
        </div>
    )
}

export default Result
