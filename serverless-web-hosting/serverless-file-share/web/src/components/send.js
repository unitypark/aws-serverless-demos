import React, { useState } from 'react'
import '../css/send.css'
import { storage } from '../init-firebase'
import Result from './result'
import { ref, uploadBytesResumable } from 'firebase/storage'

function Send() {
    const [sendState, setSendState] = useState({
        PROGRESS: 0,
        FILES: [],
        SIZE: 5e6,
        UPLOADED: false,
        URL: '',
    })

    const random = () => {
        var result = ''
        let chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
        result += String(Math.floor(Math.random() * 100) + 1)
        for (var i = 10; i > 0; --i)
            result += chars[Math.floor(Math.random() * chars.length)]
        result += String(Math.floor(Math.random() * 100) + 1)
        return result
    }
    const upload = () => {
        let len = sendState.FILES.length
        if (len === 0) {
            document.getElementById('alert').style.display = 'block'
            document.getElementById('alert').innerHTML =
                'Please Select atleast 1 file'
            setTimeout(function () {
                document.getElementById('alert').style.display = 'none'
            }, 1000)
        } else {
            try {
                let folderName = random()
                for (let i of sendState.FILES) {
                    setSendState((prev) => ({
                        ...prev,
                        PROGRESS: parseFloat(0),
                    }))
                    const storageRef = ref(storage, folderName + '/' + i.name)
                    uploadBytesResumable(storageRef, i).on(
                        'state_changed',
                        (snapshot) => {
                            var progress =
                                (snapshot.bytesTransferred /
                                    snapshot.totalBytes) *
                                100
                            setSendState((prev) => ({
                                ...prev,
                                PROGRESS: parseFloat(progress),
                            }))
                        },
                        (error) => {
                            document.getElementById('alert').style.display =
                                'block'
                            document.getElementById('alert').innerHTML =
                                'Sorry, we are facing some problem!!'
                            setTimeout(function () {
                                document.getElementById('alert').style.display =
                                    'none'
                            }, 3000)
                        },
                        () => {
                            sendState.FILES.shift()
                            if (sendState.FILES.length === 0) {
                                setSendState((prev) => ({
                                    ...prev,
                                    UPLOADED: true,
                                    URL: folderName,
                                }))
                            }
                        }
                    )
                }
                let list = document.getElementById('filedisplaylist')
                let child = list.lastElementChild
                while (child) {
                    list.removeChild(child)
                    child = list.lastElementChild
                }
            } catch (err) {
                console.log(err)
                document.getElementById('alert').style.display = 'block'
                document.getElementById('alert').innerHTML =
                    'Sorry, we are facing some problem!!'
                setTimeout(function () {
                    document.getElementById('alert').style.display = 'none'
                }, 1000)
            }
        }
    }
    const filepick = () => {
        try {
            let input = document.createElement('input')
            input.type = 'file'
            input.multiple = 'multiple'
            input.onchange = (e) => {
                var files = e.target.files
                // console.log(files);
                for (let file of files) {
                    let size = file.size
                    let oldVal = sendState.SIZE
                    if (oldVal - size >= 0) {
                        sendState.FILES.push(file)
                        setSendState((prev) => ({
                            ...prev,
                            SIZE: parseFloat(oldVal) - parseFloat(size),
                        }))
                        let list = document.createElement('LI')
                        let node = document.createTextNode(
                            String(file.name.slice(0, 20)) +
                                String('.....') +
                                '(' +
                                String((size / 1e6).toFixed(2)) +
                                ' MB)'
                        )
                        list.appendChild(node)
                        document
                            .getElementById('filedisplaylist')
                            .appendChild(list)
                    } else {
                        document.getElementById('alert').style.display = 'block'
                        document.getElementById('alert').innerHTML =
                            'Your Files exceed the 5MB limit!!!'
                        setTimeout(function () {
                            document.getElementById('alert').style.display =
                                'none'
                        }, 2000)
                    }
                }
            }
            input.click()
        } catch (err) {
            console.log(err)
        }
    }
    const removeFile = (e) => {
        let tgt = e.target
        if (tgt.tagName.toUpperCase() === 'LI') {
            let nodes = Array.from(tgt.parentNode.children)
            let index = nodes.indexOf(tgt)
            let file = sendState.FILES
            let filesize = file.slice(index, index + 1)[0].size
            file.splice(index, 1)
            let oldSize = sendState.SIZE
            setSendState((prev) => ({
                ...prev,
                SIZE: parseFloat(oldSize) + parseFloat(filesize),
                FILES: file,
            }))
            tgt.parentNode.removeChild(tgt)
        }
    }

    if (sendState.UPLOADED === false) {
        return (
            <div className="send">
                <div className="imgPanel">
                    <img
                        src={require('./image/send-file.jpg')}
                        width={'600px'}
                        height={'100%'}
                        alt="sending a file"
                        title="sending a file"
                        className="sendImage"
                    />
                </div>
                <div className="filePicker">
                    <div className="filePicker-content">
                        <img
                            src={require('./image/add-file.png')}
                            width="100px"
                            alt="add a file"
                            title="add a file"
                            onClick={filepick}
                        />
                        <h5>Add Files</h5>
                        <button id="upload" onClick={upload}>
                            Upload
                        </button>
                        <progress
                            id="statusIndicatorSend"
                            value={sendState.PROGRESS}
                            max="100"
                        />
                        <div className="filedisplay">
                            <h5>Add more files</h5>
                            <p
                                style={{
                                    borderBottom: '1px solid grey',
                                    marginBottom: '0',
                                }}
                                className="fileInfo"
                            >
                                {sendState.FILES.length} files added -{' '}
                                {(sendState.SIZE / 1e6).toFixed(2)} MB remaining{' '}
                            </p>
                            <p style={{ fontSize: '12px' }}>
                                click to remove files
                            </p>
                            <ul
                                id="filedisplaylist"
                                style={{ marginTop: '20px', padding: '0px' }}
                                onClick={removeFile}
                            ></ul>
                        </div>
                    </div>
                </div>
                <div color="danger" id="alert"></div>
            </div>
        )
    } else if (sendState.UPLOADED === true && sendState.URL.length > 0) {
        return <Result url={sendState.URL} />
    }
}

export default Send
