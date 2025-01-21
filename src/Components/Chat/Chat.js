import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import './chat.css';

let socket = null; // Avoid unnecessary reconnections

function Chat() {
  const [senderEmail, setSenderEmail] = useState(null);
  const [message, setMessage] = useState('');
  const [messageList, setMessageList] = useState([]);
  const [receiverEmail, setReceiverEmail] = useState('');
  const [users, setUsers] = useState([]);
  const [unreadCount, setUnreadCount] = useState({});
  const receiverEmailRef = useRef(''); // Reference for receiver email to prevent unnecessary re-renders

  // Update the reference for receiverEmail
  useEffect(() => {
    receiverEmailRef.current = receiverEmail;
  }, [receiverEmail]);

  // Initialize sender email from localStorage
  useEffect(() => {
    const loginUser = localStorage.getItem('user');
    if (loginUser) {
      setSenderEmail(JSON.parse(loginUser).email);
    }
  }, []);

  // Establish socket connection and handle socket events
  useEffect(() => {
    if (senderEmail) {
      socket = io('http://localhost:4000');
      socket.emit('set_username', senderEmail);

      // Listen for updates to the user list from the server
      socket.on('all_users', (users) => setUsers(users));

      return () => {
        socket.disconnect(); // Disconnect socket when senderEmail changes or component unmounts
        socket = null;
      };
    }
  }, [senderEmail]);

  // Fetch messages when senderEmail or receiverEmail changes
  useEffect(() => {
    if (senderEmail && receiverEmail) {
      axios
        .get(
          `http://localhost:4000/api/message?senderEmail=${senderEmail}&receiverEmail=${receiverEmail}`
        )
        .then((response) => setMessageList(response.data.data)) // Set the messages in state
        .catch((error) => {
          console.error('Error fetching messages:', error);
          setMessageList([]); // Handle error and reset message list
        });
    }
  }, [senderEmail, receiverEmail]);

  // Fetch unread message counts when senderEmail changes
  useEffect(() => {
    fetchUnreadCounts(); // Fetch unread counts when senderEmail changes
  }, [senderEmail]);

  // Mark a message as read by sending a request to the backend
  const markMessageAsRead = async (senderEmail, receiverEmail) => {
    try {
      await axios.put(
        `http://localhost:4000/api/message/mark-read?senderEmail=${senderEmail}&receiverEmail=${receiverEmail}`
      );
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  // Set the receiver email and mark messages as read
  const receiverEmailFun = async (receiverEmail) => {
    setReceiverEmail(receiverEmail);
    await markMessageAsRead(receiverEmail, senderEmail); // Mark messages as read for the selected user
    fetchUnreadCounts(); // Refresh unread counts
  };

  // Fetch unread message counts
  const fetchUnreadCounts = async () => {
    if (!senderEmail) return; // Prevent unnecessary API calls if senderEmail is not set
    try {
      const response = await axios.get(
        `http://localhost:4000/api/message/unread?receiverEmail=${senderEmail}`
      );
      setUnreadCount(response.data.data); // Update unread count in the state
    } catch (error) {
      console.error('Error fetching unread counts:', error);
    }
  };

  // Send a message and update unread counts
  const sendMessage = () => {
    if (message.trim() && receiverEmail && socket) {
      const messageData = {
        senderId: socket.id,
        senderEmail,
        receiverEmail,
        message,
        time: new Date().toLocaleTimeString(),
      };

      socket.emit('send_message', messageData); // Emit the message to the server
      setMessageList((prev) => [...prev, { ...messageData, author: 'You' }]); // Add the message to the message list
      setMessage(''); // Clear the message input field

      // Update unread counts after sending the message
      fetchUnreadCounts();
    }
  };

  // Listen for incoming messages from the socket server
  useEffect(() => {
    if (socket) {
      socket.on('receive_message', async (data) => {
        // Update message list if the message is for the current receiver
        if (
          data.receiverSocketId === socket.id &&
          data.senderEmail === receiverEmailRef.current
        ) {
          setMessageList((prev) => [...prev, { ...data, author: 'Other' }]);
        }

        // Mark the message as read if it is from the current receiver
        if (data.senderEmail === receiverEmailRef.current) {
          await markMessageAsRead(data.senderEmail, senderEmail);
        }

        // Update unread counts on receiving a new message
        fetchUnreadCounts();
      });

      return () => {
        socket.off('receive_message'); // Clean up listener when component unmounts or socket changes
      };
    }
  }, [socket, senderEmail]);

  return (
    <div className="chat-container">
      <div className="sidebar">
        <h3>User List</h3>
        <div className="user-list">
          {users.map((user) =>
            senderEmail !== user.email ? (
              <div
                key={user._id}
                className={`user-item ${receiverEmail === user.email ? 'active' : ''}`}
                onClick={() => receiverEmailFun(user.email)}
              >
                <span
                  className="status-icon"
                  style={{
                    backgroundColor: user.online ? 'green' : 'red',
                  }}
                ></span>
                {user.name}
                {/* Add the unread message count */}
                {unreadCount[user.email] > 0 && (
                  <span className="message-count">{unreadCount[user.email]}</span>
                )}
              </div>
            ) : null
          )}
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
              {msg.message}
              <span className="time">{msg.time}</span> {/* Display message timestamp */}
            </div>
          ))}
        </div>
        {receiverEmail && (
          <div className="chat-footer">
            <input
              type="text"
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)} // Update message state on input change
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()} // Send message on Enter key press
            />
            <button onClick={sendMessage}>Send</button> {/* Send message on button click */}
          </div>
        )}
      </div>
    </div>
  );

}

export default Chat;