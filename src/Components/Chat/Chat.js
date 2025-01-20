import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import './chat.css';

let socket = null; // Declare socket outside to avoid reconnecting unnecessarily
function Chat() {
  const [senderEmail, setSenderEmail] = useState(null);
  const [message, setMessage] = useState('');
  const [messageList, setMessageList] = useState([]);
  const [receiverEmail, setReceiverEmail] = useState('');
  const [users, setUsers] = useState([]);
  const receiverEmailRef = useRef('');

  useEffect(() => {
    receiverEmailRef.current = receiverEmail;
  }, [receiverEmail]);

  // Initialize sender email from localStorage
  useEffect(() => {
    const loginUser = localStorage.getItem('user');
    if (loginUser) {
      const userObj = JSON.parse(loginUser);
      setSenderEmail(userObj.email);
    } else {
      console.warn('No user found in localStorage.');
    }
  }, []);

  // Establish socket connection when senderEmail is set
  useEffect(() => {
    if (!socket && senderEmail) {
      socket = io('http://localhost:4000');
      socket.emit('set_username', senderEmail);

      socket.on('all_users', (users) => {
        setUsers(users);
      });
    }

    return () => {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
    };
  }, [senderEmail]);


  useEffect(() => {
    console.log("users : ", users)
    console.log("senderEmail : ", senderEmail, "receiverEmail : ", receiverEmail)
  }, [users, senderEmail, receiverEmail])

  // Fetch messages for the selected chat
  useEffect(() => {
    if (senderEmail && receiverEmail) {
      const fetchMessages = async () => {
        try {
          const response = await axios.get(
            `http://localhost:4000/api/message?senderEmail=${senderEmail}&receiverEmail=${receiverEmail}`
          );
          setMessageList(response.data.data);
        } catch (error) {
          console.error('Error fetching messages:', error);
        }
      };
      fetchMessages();
    }
  }, [senderEmail, receiverEmail]);

  const sendMessage = () => {
    if (message.trim() && receiverEmail && socket) {
      const messageData = {
        senderId: socket.id,
        senderEmail,
        receiverEmail,
        message,
        time: new Date().toLocaleTimeString(),
      };

      socket.emit('send_message', messageData);
      setMessageList((prev) => [...prev, { ...messageData, author: 'You' }]);
      setMessage('');
    } else {
      console.warn('Message or receiver email is missing.');
    }
  };

  // Handle receiving a message
  useEffect(() => {
    if (socket) {
      const handleReceiveMessage = (data) => {
        if (
          data.receiverSocketId === socket.id &&
          data.senderEmail === receiverEmailRef.current
        ) {
          setMessageList((prev) => [...prev, { ...data, author: 'Other' }]);
        }
      };

      socket.on('receive_message', handleReceiveMessage);

      return () => {
        socket.off('receive_message', handleReceiveMessage);
      };
    }
  }, [socket]);

  return (
    <div className="chat-container">
      <div className="sidebar">
        <h3>User List</h3>

        <div className="user-list">
          {users.map((user) => (
            <div
              key={user._id}
              className={`user-item ${receiverEmail === user.email ? 'active' : ''}`}
              onClick={() => setReceiverEmail(user.email)}
            >
              <span
                className="status-icon"
                style={{
                  backgroundColor: user.online ? 'green' : 'red',
                }}
              ></span>
              {user.name}
            </div>
          ))}
        </div>
      </div>

      <div className="chat-window">
        <div className="chat-header">
          {receiverEmail ? `Chat with ${receiverEmail}` : 'Select a User to Chat'}
        </div>
        <div className="chat-body">
          {messageList.map((msg, index) => (
            <div
              key={index}
              className={`message ${msg.author === 'You' ? 'your-message' : 'other-message'}`}
            >
              <span>
                <strong>{msg.author}:</strong> {msg.message}
              </span>
              <span className="time">{msg.time}</span>
            </div>
          ))}
        </div>
        {receiverEmail && (
          <div className="chat-footer">
            <input
              type="text"
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Chat;
