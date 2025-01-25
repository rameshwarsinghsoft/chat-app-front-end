import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import './chatOld.css';

let socket = null; // Avoid unnecessary reconnections

function Chat() {
  const [senderEmail, setSenderEmail] = useState(null);
  const [message, setMessage] = useState('');
  const [messageList, setMessageList] = useState([]);
  const [receiverEmail, setReceiverEmail] = useState('');
  const [users, setUsers] = useState([]);
  const [unreadCount, setUnreadCount] = useState({});
  const receiverEmailRef = useRef(''); // Reference for receiver email to prevent unnecessary re-renders
  const [showOptions, setShowOptions] = useState(false);
  const [messageId, setMessageId] = useState(null);
  const [deleteOperationSuccess, setDeleteOperationSuccess] = useState(false);
  const [updateOperationSuccess, setUpdateOperationSuccess] = useState(false);
  const [editModel, setEditModel] = useState(false);
  const [updatedMessage, setUpdatedMessage] = useState(""); // Store updated message

  // Sync the latest receiverEmail to the ref to avoid stale closures
  useEffect(() => {
    receiverEmailRef.current = receiverEmail;
  }, [receiverEmail]);

  // Retrieve the logged-in user's email from localStorage and set senderEmail on component mount
  useEffect(() => {
    const loginUser = localStorage.getItem('user');
    if (loginUser) {
      setSenderEmail(JSON.parse(loginUser).email);
    }
  }, []);

  // Establish socket connection and handle events for real-time communication
  // Retrieve all users from the backend and update the user list
  useEffect(() => {
    if (senderEmail) {
      socket = io('http://localhost:4000');
      socket.emit('set_username', senderEmail);

      socket.on('all_users', (users) => setUsers(users));

      return () => {
        socket.disconnect(); // Disconnect socket when senderEmail changes or component unmounts
        socket = null;
      };
    }
  }, [senderEmail]);

  useEffect(() => {
    getAllMsg();
  }, [receiverEmail, updateOperationSuccess, deleteOperationSuccess]);

  const getAllMsg = async () => {
    if (senderEmail && receiverEmail) {
      try {
        const response = await axios.get(
          `http://localhost:4000/api/message?senderEmail=${senderEmail}&receiverEmail=${receiverEmail}`
        );
        setMessageList(response.data.data);
        console.log("response.data.data : ", response.data.data)
      } catch (error) {
        console.error("Error fetching messages:", error);
        setMessageList([]);
      }
    }
  };

  // Fetch unread message counts when senderEmail changes
  useEffect(() => {
    fetchUnreadCounts();
  }, [senderEmail]);

  // Set the receiver email and mark messages as read
  const receiverEmailFun = async (receiverEmail) => {
    setReceiverEmail(receiverEmail);
    await markMessageAsRead(receiverEmail, senderEmail);
    fetchUnreadCounts();
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

      socket.emit('send_message', messageData);
      setMessageList((prev) => [...prev, { ...messageData, author: 'You' }]);
      setMessage('');
    }
  };

  // Listen for incoming messages from the socket server
  useEffect(() => {
    if (socket) {
      socket.on('receive_message', async (data) => {
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

  // Toggle edit/delete options
  const handleClick = (_id) => {
    console.log("showOptions : ", showOptions)
    setShowOptions(!showOptions);
    setMessageId(_id);
    let msgObj = messageList.find(msg => msg._id === _id);
    let msg = msgObj.message;
    setUpdatedMessage(msg);
  };

  const handleEdit = () => {
    setShowOptions(!showOptions);
    setEditModel(true)
  };

  // Update the message in the backend
  const updateMessageFun = async () => {
    try {
      await axios.put('http://localhost:4000/api/message', {
        _id: messageId,
        message: updatedMessage,
      });
      setUpdateOperationSuccess(true);
    } catch (error) {
      console.error('Error updating message:', error);
    }
    setEditModel(false);
    setMessageId(null)
  }

  // Emit update message event to notify the server
  useEffect(() => {
    if (updateOperationSuccess && receiverEmail && socket) {
      socket.emit('update_message', { receiverEmail });
      setUpdateOperationSuccess(false);
    }
  }, [updateOperationSuccess, receiverEmail, socket]);

  // Handle update message reflection
  useEffect(() => {
    if (socket) {
      const handleDeleteMessage = (data) => {
        console.log("Delete message event received:", data);
        getAllMsg();
      };

      socket.on("update_reflect", handleDeleteMessage);

      // Clean up the event listener to avoid duplication
      return () => {
        socket.off("update_reflect", handleDeleteMessage);
      };
    }
  }, [socket, getAllMsg]);

  // Handle message deletion
  const handleDelete = async () => {
    const confirmDelete = window.confirm("Are you sure you want to delete this message?");
    if (confirmDelete) {
      const response = await axios.delete(
        `http://localhost:4000/api/message/${messageId}`
      );
      console.log('Delete clicked', response);
      setDeleteOperationSuccess(true)
    }

    setShowOptions(!showOptions);
  };

  // Emit delete message event to notify the server
  useEffect(() => {
    if (deleteOperationSuccess && receiverEmail && socket) {
      socket.emit('delete_message', { receiverEmail });
      setDeleteOperationSuccess(false);
    }
  }, [deleteOperationSuccess, receiverEmail, socket]);

  // Handle delete message reflection
  useEffect(() => {
    if (socket) {
      const handleDeleteMessage = (data) => {
        console.log("Delete message event received:", data);
        getAllMsg();
      };

      socket.on("delete_reflect", handleDeleteMessage);

      // Clean up the event listener to avoid duplication
      return () => {
        socket.off("delete_reflect", handleDeleteMessage);
      };
    }
  }, [socket, getAllMsg]);

  return (
    <div className="chat-container">
      {/* Sidebar with User List */}
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
                {/* Display unread message count */}
                {unreadCount[user.email] > 0 && (
                  <span className="message-count">{unreadCount[user.email]}</span>
                )}
              </div>
            ) : null
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className="chat-window">

        {/* Chat Header */}
        <div className="chat-header">
          {receiverEmail ? `Chat with ${receiverEmail}` : 'Select a User to Chat'}
        </div>

        {/* Modal for Updating Message */}
        {editModel && (
          <div className="modal-overlay">
            <div className="modal-container">
              <h1>Update Message</h1>
              <div className="update-input-group">
                <label htmlFor="message">Message:</label>
                <input
                  type="text"
                  value={updatedMessage}
                  onChange={(e) => setUpdatedMessage(e.target.value)}
                />
              </div>
              <div className="button-group">
                <button className="update-button" onClick={updateMessageFun}>
                  Update
                </button>
                <button
                  className="cancel-button"
                  onClick={() => {
                    setEditModel(false);
                    setMessageId(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Chat Body */}
        <div className="chat-body">
          {/* Message List */}
          {messageList.map((msg) => (
            <div key={msg._id}
              className={`message ${msg.senderEmail === senderEmail ? "sent" : "received"}`}
            >
              {msg.message}
              <div
                className="options-icon"
                onClick={() => handleClick(msg._id)}
                style={{ cursor: 'pointer' }}
              >
                ...

                <p className='time'>11:37</p>

                {/* Modal for Edit/Delete Options */}
                {showOptions && messageId === msg._id && (
                  <div className="modal">
                    <button className="modal-button" onClick={() => handleEdit(msg._id)}>
                      Edit
                    </button>
                    <button className="modal-button" onClick={() => handleDelete(msg._id)}>
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Chat Footer */}
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

};

export default Chat;