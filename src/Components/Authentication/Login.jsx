import Cookies from "js-cookie";
import { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { toast } from 'react-toastify';
import axios from 'axios';
import './index.css';
import login from '../../assets/login.png';
import Spinner from 'react-bootstrap/Spinner';

// const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function Login() {
  const navigate = useNavigate();
  const [userDetail, setUserDetail] = useState({ username: "", password: "" });
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState({ username: "", password: "" });
  const [showLoader, setShowLoader] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMsg, setErrorMsg] = useState({});
  const [successMsg, setSuccessMsg] = useState({});
  const [hasMsg, setHasMsg] = useState(false);

  const FormDetail = (event) => {
    let { name, value } = event.target
    if (name === "username") {
      value = value.toLowerCase();
    }
    setUserDetail({ ...userDetail, [name]: value })
  }

  useEffect(() => {
    toast.error(errorMsg, {
      position: "top-right",
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "light",
    });
  }, [hasError, errorMsg])

  useEffect(() => {
    if (hasMsg) {
      toast.success(successMsg, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",
      });
    }
  }, [hasMsg, successMsg]);

  let FormSubmit = async (e) => {
    e.preventDefault()
    if (userDetail.username == "" && userDetail.password == "") {
      setError({ ...error, username: "User Name can't be empty", password: "Password Can't be empty" });
    } else if (userDetail.username == "") {
      setError({ ...error, username: "User Name can't be empty" });
    }
    else if (userDetail.password == "") {
      setError({ ...error, password: "Password Can't be empty" });
    } else {
      setShowLoader(true);
      axios
        .post(
          // `${VITE_API_BASE_URL}/api/auth/login`,
          `http://localhost:4000/api/auth/login`,
          {
            email: userDetail.username,
            password: userDetail.password,
          },
          {
            headers: {
              "ngrok-skip-browser-warning": "true",
            },
          }
        )
        .then((response) => {
          if (response.status === 200) {
            localStorage.setItem("token", JSON.stringify(response?.data.token));
            localStorage.setItem("user", JSON.stringify(response?.data.data));
            if (rememberMe) {
              Cookies.set("token", response?.data.token, {
                expires: 7,
                secure: true,
                sameSite: "Strict",
              });
            } else {
              sessionStorage.setItem("token", response?.token);
            }

            navigate("/chat", { replace: true });
            setHasMsg(true);
            setSuccessMsg(response.data.message);
            setShowLoader(false);
          } else {
            console.log("message : ", response.data.message);
            setHasMsg(false);
            setHasError(true)
            setErrorMsg(response.data.message)
            setShowLoader(false);
          }
        }
        )
        .catch((error) => {
          console.log("error : ", error)
          if (error.response) {
            console.log("Error message : ", error.response.data.message);
            setHasMsg(false);
            setHasError(true);
            setErrorMsg(error.response.data.message);
            setShowLoader(false);
          } else {
            setHasMsg(false);
            setHasError(true);
            setErrorMsg(error.message);
            setShowLoader(false);
          }
        });
    }
  }

  return (
    <div className='login-container'>
      {showLoader && (
        <div className="spinner-container">
          <Spinner animation="border" variant="primary" />
        </div>
      )}
      <div className='login-image'>
        <img src={login} alt='Login' />
      </div>
      <div className='login-form'>
        <div className='form-group'>
          <h1>E-Commerce</h1>

          <form action='login-form-container' className='login-form-container'>
            <div className='input-group'>
              <label htmlFor='username'>User Name: <span className="required">*</span>   {!userDetail.username && (
                <span className="blank-error-msg">{error.username}</span>
              )}</label>
              <input type='email' id='username' name='username' placeholder='Enter your email' onChange={FormDetail} />
            </div>

            <div className='input-group'>
              <label htmlFor='password'>Password: <span className="required">*</span>
                {!userDetail.password && (
                  <span className="blank-error-msg">{error.password}</span>
                )}
              </label>
              <input type='password' id='password' name='password' placeholder='Enter your password' onChange={FormDetail} />
            </div>


            <div className='checkbox-password'>
              <div className="checkbox-label">
                <input type="checkbox" onChange={() => setRememberMe(!rememberMe)} />
                <p className="text-[#6E7C87] text-sm">Remember Me</p>
              </div>

              <p>
                <a href='/forgot-password'>Forgot Your Password?</a>
              </p>
            </div>

            <button onClick={FormSubmit} type='submit' className='btn'>
              Login
            </button>

            <div className='form-footer'>
              <p>
                Not an account? <a href='/register'>Register here</a>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login
