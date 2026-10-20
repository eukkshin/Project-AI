/*
Next.js 13버전 이상에서 이 파일이 클라이언트(브라우저)
측에서 실행되는 컴포넌트임을 명시
React의 useState, useEffect같은 훅을 사용하려면 필요
*/

"use client";
import "bootstrap/dist/css/bootstrap.min.css";

import { error } from "console";
import {
  MDBBtn,
  MDBCard,
  MDBCardBody,
  MDBCardFooter,
  MDBCardHeader,
  MDBContainer,
  MDBIcon,
  MDBSpinner,
} from "mdb-react-ui-kit";
import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

//리액트 라이브러리에서 기본 기능과 상태관리(useState), 참조(useRef), 생명주기(useEffect)

/*메세지 타입 정의
TypeScript 를 사용하여 'Message'라는 데이터의 형태(타입)를 정의
이렇게 하면 코드 작성 중 실수를 방지할 수 있음
*/

//메세지 타입 정의
interface Message {
  id: number;
  text: string;
  sender: "user" | "ai";
  //메세지를 보낸 사람이 'user'인지 'ai'인지 구분
}

export default function Home() {
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false); //로딩 상태 추가(초기값:false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "안녕하세요! 무엇이든 물어보실 수 있는 AI 어시스턴트 입니다. 오늘 어떤 도움이 필요하신가요?",
      sender: "ai",
    },
  ]);
  /*
    채팅이 길어질 때 가장 최신 메시지(맨아래)로 자동 스크롤하기 위해
    화면의 특정 HTML요소를 가리키는 참조(REF)를 만듦
    */
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /*
    특정 상황에서 자동으로 실행되는 함수 useEffect 사용
    여기서는 messages배열이 변경될 때마다 (즉 세 메세지가 추가될 때마다) 
    실행됨
    */

  useEffect(() => {
    //messagesEndRef가 가리키는 화면 요소(맨 아래 빈 div)로 부드럽게(smooth) 스크롤 이동
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  //사용자가 전송 버튼을 누르거나 엔터키를 쳤을 때 실행되는 비동기 함수
  const handleSend = async () => {
    //비어져있는 메세지 감시(양쪽공백제외) / 비어져있으면 함수종료(return) 빈메세지 방지
    if (!inputText.trim()) return;

    //사용자 메시지 추가
    const newUserMessage: Message = {
      id: Date.now(), //현재시간 밀리초로 가져와 ID로 사용
      text: inputText, //사용자가 입력한 텍스트
      sender: "user", //보낸사람:사용자
    };

    //기본 메세지 배열(prev)의 끝에 방금 만든 사용자 메시지를 추가하여 화면을 업데이트
    setMessages((prev) => [...prev, newUserMessage]);

    //메세지를 화면에 추가했으니 입력창은 다시 빈칸으로 비워둠
    setInputText("");
    setIsLoading(true); //AI 응답 대기 상태로 변경

    //여기에 추후 파이선 백앤드 API 가 들어갈 예정
    try {
      const response = await fetch("http://localhost:8000/api/chat", {
        method: "POST", //데이터를 서버로 보내는 방식
        headers: {
          "Content-Type": "application/json",
          //우리가 보내는 데이터 형식 = json
        },
        //js 객체 ({ message: ... })를 JSON 문자열로 변환하여 보냄
        body: JSON.stringify({ message: newUserMessage.text }),
      });

      //서버에서 온 응답 상태가 정상(200번대)이 아니면 에러를 발생시킴
      if (!response.ok) {
        throw new Error("서버 에러가 발생했습니다");
      }

      //서버가 정상적으로 보내준 JSON 데이터를 자바스크립트 객체로 변환(파싱)한다
      const data = await response.json();

      //백앤드에서 보내준 답변(data.reply)을 이용해 AI메세지 객체를 만들고 화면에 추가
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: data.reply,
          sender: "ai",
        },
      ]);

      /*
            파이썬 백엔드 서버(FastAPI)로 데이터를 보냄(POST 요청)
            fetch 함수는 네트워크 통신 담당, await 써서 응답 대기
            */
    } catch (error) {
      //통신 중 에러(서버 꺼짐, 인터넷 끊김 등)가 발생하면 콘솔에 에러를 출력
      console.error("통신 에러", error);
      //사용자에게 서버와 연결할 수 없다는 안내 메시지를 AI가 말하는 것처럼 화면에 띄어줌
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          text: "백앤드 서버에 연결할 수 없습니다(파이썬 서버(8000)켜져 있는지 확인 바랍니다.",
          sender: "ai",
        },
      ]);
    } finally {
      setIsLoading(false);
    }

    /*//임시 AI 응답 (나중에 백앤드 연동후 삭제)
        setTimeout(() => {
            setMessages((prev) => [
            ...prev, 
            {id: Date.now(), text: "추후 백앤드 연결 예정", sender: "ai"}
            ]);
        },1000)*/
  };

  //사용자가 입력창에 키보드를 누를 때 실행되는 함수
  const handleKeypress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    //누른키 = Enter 현재 로딩중이 아닐때만 전송(handleSend)함수를 실행
    if (e.key === "Enter" && !isLoading) {
      handleSend();
    }
  };

  return (
    <>
      <MDBContainer className="py-5" style={{ maxWidth: "800px" }}>
        <MDBCard
          style={{
            borderRadius: "15px",
            height: "80vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* 헤더 영역 */}
          <MDBCardHeader
            className="d-flex justify-content-between align-items-center p-3 text-white"
            style={{
              borderTopLeftRadius: "15px",
              borderTopRightRadius: "15px",
              backgroundColor: "#3f51b5",
            }}
          >
            <div className="d-flex align-items-center">
              <MDBIcon fas icon="robot" size="lg" className="me-2" />
              <h5 className="mb-0 fw-bold">노원구 맛집 AI</h5>
            </div>
            <MDBIcon fas icon="utensils" size="lg" />
          </MDBCardHeader>

          {/* 채팅 내용 영역 */}
          <MDBCardBody
            style={{ overflowY: "auto", flex: 1, backgroundColor: "#f9fbfd" }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`d-flex flex-row justify-content-${msg.sender === "user" ? "end" : "start"}`}
              >
                {msg.sender === "ai" && (
                  <div
                    style={{ width: "45px", height: "100%" }}
                    className="me-2 text-center"
                  >
                    <MDBIcon
                      fas
                      icon="robot"
                      size="2x"
                      style={{ color: "#3f51b5" }}
                    />
                  </div>
                )}
                <div
                  className="p-3"
                  style={{
                    borderRadius: "15px",
                    backgroundColor:
                      msg.sender === "user" ? "#3f51b5" : "#e0e0e0",
                    color: msg.sender === "user" ? "white" : "black",
                    maxWidth: "70%",
                  }}
                >
                  <div
                    className="small mb-0"
                    style={{ lineHeight: "1.5", whiteSpace: "pre-wrap" }}
                  >
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}

            {/* 로딩상태(isLoading === true 일때) 화면에 보여주는 "생각하는중..." */}
            {isLoading && (
              <div className="d-flex flex-row justify-content-start mb-4">
                <div
                  style={{ width: "45px", height: "100%" }}
                  className="me-2 text-center"
                >
                  <MDBIcon
                    fas
                    icon="robot"
                    size="2x"
                    style={{ color: "#3f51b5" }}
                  />
                </div>
                <div
                  className="p-3"
                  style={{ borderRadius: "15px", backgroundColor: "#e0e0e0" }}
                >
                  <MDBSpinner size="sm" rol="status" tag="span" />
                  <span className="ms-2 small">생각하는중...</span>
                </div>
              </div>
            )}

            {/* 사용자가 새 메세지를 쓸 때마다 화면을 이 위치로 끌어내리는 기준점 */}
            <div ref={messagesEndRef} />
          </MDBCardBody>
          {/* 입력 영역 */}
          <MDBCardFooter className="text-muted d-flex justify-content-start align-items-center p-3">
            <input
              type="text"
              className="form-control form-control-lg"
              placeholder="메세지를 입력하세요.."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeypress}
              style={{ borderRadius: "10px" }}
            />
            <MDBBtn
              color="primary"
              className="ms-3"
              style={{
                borderRadius: "10px",
                minWidth: "100px",
              }}
              onClick={handleSend}
              disabled={isLoading}
            >
              <MDBIcon fas icon="paper-plane" className="me-2">
                전송
              </MDBIcon>
            </MDBBtn>
          </MDBCardFooter>
        </MDBCard>
      </MDBContainer>
    </>
  );
}
