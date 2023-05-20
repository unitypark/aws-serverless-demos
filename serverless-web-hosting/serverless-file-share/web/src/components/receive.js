import React, { useState } from 'react'
import '../css/receive.css'
import { storage } from '../init-firebase'
import { ref, listAll, getDownloadURL } from 'firebase/storage'

function Receive() {
    const [receiveState, setReceiveState] = useState({
        PROGRESS: 0,
    })
    const CODE = String(window.location.href).slice(36)

    const download = (files) => {
        let len = files.length
        let step = (100 / len).toFixed(10)
        setReceiveState((prev) => ({ ...prev, PROGRESS: parseFloat(0) }))
        if (len > 0) {
            for (let i = 0; i < len; i++) {
                getDownloadURL(files[i])
                    .then((url) => {
                        let oldval = receiveState.PROGRESS
                        setReceiveState((prev) => ({
                            ...prev,
                            PROGRESS: parseFloat(oldval) + parseFloat(step),
                        }))
                        document.getElementById('input').value = ''
                        let ul = document.getElementById('URLdisplaylist')
                        ul.style.display = 'block'
                        let list = document.createElement('LI')
                        let fullFileName = files[i].name.toLowerCase()
                        let [, fileType] = fullFileName.split('.')
                        let fileImgNode = null

                        if (fileType === 'pdf') {
                            fileImgNode =
                                '<img src="https://img.icons8.com/fluent/50/000000/pdf.png" height="20px" width="20px"/>'
                        } else if (fileType === 'doc' || fileType === 'docx') {
                            fileImgNode =
                                '<img src="https://img.icons8.com/fluent/48/000000/microsoft-word-2019.png" height="20px" width="20px"/>'
                        } else if (
                            fileType === 'jpg' ||
                            fileType === 'jpeg' ||
                            fileType === 'png'
                        ) {
                            fileImgNode =
                                '<img src="https://img.icons8.com/fluent/48/000000/image.png" height="20px" width="20px"/>'
                        } else if (fileType === 'txt') {
                            fileImgNode =
                                '<img src="https://img.icons8.com/ultraviolet/40/000000/txt.png" height="20px" width="20px"/>'
                        } else if (fileType === 'xlsx' || fileType === 'xls') {
                            fileImgNode =
                                '<img src="https://img.icons8.com/color/48/000000/xls.png" height="20px" width="20px"/>'
                        } else if (fileType === 'pptx' || fileType === 'ppt') {
                            fileImgNode =
                                "<img src='https://img.icons8.com/fluent/48/000000/microsoft-powerpoint-2019.png' width='20px' height='20px'/>"
                        } else if (fileType === 'mp3') {
                            fileImgNode =
                                '<img src="https://img.icons8.com/cotton/64/000000/audio-file.png" height="20px" width="20px"/>'
                        } else if (fileType === 'zip') {
                            fileImgNode =
                                '<img src="https://img.icons8.com/ultraviolet/40/000000/zip.png" width="20px" height="20px"/>'
                        } else if (fileType === 'rar') {
                            fileImgNode =
                                '<img src="https://img.icons8.com/ultraviolet/40/000000/rar.png" width="20px" height="20px"/>'
                        } else {
                            fileImgNode =
                                '<img src="https://img.icons8.com/fluent/48/000000/file.png" height="20px" width="20px"/>'
                        }

                        list.innerHTML =
                            '<a href=' +
                            url +
                            " download target='_blank'>" +
                            fileImgNode +
                            fullFileName.split(30) +
                            '</a>'
                        ul.appendChild(list)
                    })
                    .catch((error) => {
                        console.log(error)
                        document.getElementById('alertRecieve').style.display =
                            'block'
                        document.getElementById('alertRecieve').innerHTML =
                            'Unable to Download File'
                        setTimeout(function () {
                            document.getElementById(
                                'alertRecieve'
                            ).style.display = 'none'
                        }, 3000)
                    })
            }
        }
    }
    const checkFiles = () => {
        let ul = document.getElementById('URLdisplaylist')
        let child = ul.lastElementChild
        while (child) {
            ul.removeChild(child)
            child = ul.lastElementChild
        }
        setReceiveState((prev) => ({
            ...prev,
            PROGRESS: parseFloat(0),
        }))
        let text = document.getElementById('input').value
        if (text.length > 0) {
            const listRef = ref(storage, text + '/')
            listAll(listRef)
                .then((res) => {
                    if (res.items.length > 0) {
                        download(res.items)
                    } else {
                        document.getElementById('alertRecieve').style.display =
                            'block'
                        document.getElementById('alertRecieve').innerHTML =
                            'Either the name you entered is wrong or the item has expired'
                        setTimeout(function () {
                            document.getElementById(
                                'alertRecieve'
                            ).style.display = 'none'
                        }, 4000)
                    }
                })
                .catch(function (error) {
                    console.log(error)
                    document.getElementById('alertRecieve').style.display =
                        'block'
                    document.getElementById('alertRecieve').innerHTML =
                        'We faced some error while searching for your files please try again!!'
                    setTimeout(function () {
                        document.getElementById('alertRecieve').style.display =
                            'none'
                    }, 4000)
                })
        } else {
            document.getElementById('alertRecieve').style.display = 'block'
            document.getElementById('alertRecieve').innerHTML =
                'Enter a valid Name'
            setTimeout(function () {
                document.getElementById('alertRecieve').style.display = 'none'
            }, 1500)
        }
    }
    const inputHighlight = () => {
        let input = document.getElementById('input')
        input.style.border = 'none'
        input.style.borderBottom = '1px solid #6125ac'
    }
    return (
        <div className="Recieve">
            <div className="imgPanel">
                <img
                    src={require('./image/people-recieving-shared-file.jpg')}
                    width={'600px'}
                    alt="recieving a shared file"
                    title="recieving a shared file"
                    className="recieveImage"
                />
            </div>
            <div className="ContentPanel">
                <div className="contentPanelElements">
                    <img
                        src={require('./image/file-download.png')}
                        width="200px"
                        alt=" file download icon"
                        title="file download icon"
                        className="downloadImage"
                    />
                    <progress
                        id="statusIndicator"
                        value={receiveState.PROGRESS}
                        max="100"
                    />
                    <input
                        type="text"
                        placeholder="Enter Download Code"
                        id="input"
                        autoComplete="off"
                        onFocus={inputHighlight}
                        defaultValue={CODE}
                    />
                    <span style={{ marginTop: '0', fontSize: '12px' }}>
                        please click allow popup if prompted
                    </span>
                    <button id="download" onClick={checkFiles}>
                        Download
                    </button>
                    <div className="URLdisplay">
                        <p
                            style={{
                                borderBottom: '1px solid grey',
                                margin: '0',
                                textAlign: 'left',
                            }}
                        >
                            Files will appear here:
                        </p>
                        <ul
                            id="URLdisplaylist"
                            style={{ marginTop: '20px' }}
                            /* onClick={removeFile} */
                        ></ul>
                    </div>
                </div>
            </div>
            <div color="danger" id="alertRecieve"></div>
        </div>
    )
}

export default Receive
