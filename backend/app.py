import streamlit as st
import requests

st.set_page_config(
    page_title="나만의 AI 챗봇",
    page_icon="🤖",
    layout="centered",
)

st.title("🤖 나만의 AI 어시스턴트")
st.caption("AI 챗봇")

# 1. 세션 상태(대화 기록) 초기화
if "messages" not in st.session_state:
    st.session_state.messages = [
        {"role": "assistant", "content": "안녕하세요! 무엇이든 물어보세요. 오늘 어떤 도움이 필요하신가요?"}
    ]

# 2. 기존 대화 기록 화면에 출력
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# 3. 사용자 입력 처리
# ... (앞부분 동일)

if user_input := st.chat_input("메세지를 입력하세요...."):
    st.session_state.messages.append({"role": "user", "content": user_input})
    with st.chat_message("user"):
        st.markdown(user_input)

    with st.chat_message("assistant"):
        with st.spinner("생각하는 중..."):
            try:
                fastapi_url = "http://localhost:8000/api/chat"

                # 🔥 중요: 단일 메시지가 아니라, 지금까지의 전체 대화 기록을 통째로 보냅니다!
                payload = {"messages": st.session_state.messages}
                response = requests.post(fastapi_url, json=payload)

                if response.status_code == 200:
                    data = response.json()
                    ai_reply = data.get("reply", "응답을 받지 못했습니다")
                else:
                    ai_reply = f"서버 에러가 발생했습니다. (상태코드: {response.status_code})"

            except Exception as e:
                ai_reply = f"FastAPI 백엔드 서버와 연결할 수 없습니다\n\n(에러: {e})"

            st.markdown(ai_reply)
            st.session_state.messages.append({"role": "assistant", "content": ai_reply})
