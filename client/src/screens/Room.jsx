import React, { useEffect, useCallback, useState } from "react";
import peer from "../service/peer";
import { useSocket } from "../context/SocketProvider";

const RoomPage = () => {
  const socket = useSocket();
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const handleUserJoined = useCallback(({ email, id }) => {
    console.log(`Email ${email} joined room`);
    setRemoteSocketId(id);
  }, []);

  const handleCallUser = useCallback(async () => {
    try {
      // Request access to microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("Sending audio stream:", stream);
      setMyStream(stream);
  
      // Check if microphone access was granted
      if (stream.getAudioTracks().length === 0) {
        console.error("No audio tracks found! Microphone may not be working.");
      }
  
      const offer = await peer.getOffer();
      socket.emit("user:call", { to: remoteSocketId, offer });
  
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  }, [remoteSocketId, socket]);
  

  const handleIncomingCall = useCallback(
    async ({ from, offer }) => {
      setRemoteSocketId(from);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setMyStream(stream);

        const answer = await peer.getAnswer(offer);
        socket.emit("call:accepted", { to: from, ans: answer });
      } catch (error) {
        console.error("Error handling incoming call:", error);
      }
    },
    [socket]
  );

  const sendStreams = useCallback(() => {
    if (myStream) {
      myStream.getTracks().forEach((track) => {
        peer.peer.addTrack(track, myStream);
      });
    }
  }, [myStream]);

  const handleCallAccepted = useCallback(
    ({ from, ans }) => {
      peer.setLocalDescription(ans);
      console.log("Call Accepted!");
      sendStreams();
    },
    [sendStreams]
  );

  useEffect(() => {
    peer.peer.addEventListener("track", (ev) => {
      const [remoteAudioStream] = ev.streams;
      console.log("Receiving remote audio stream");
      setRemoteStream(remoteAudioStream);
    });
  }, []);

  useEffect(() => {
    socket.on("user:joined", handleUserJoined);
    socket.on("incoming:call", handleIncomingCall);
    socket.on("call:accepted", handleCallAccepted);

    return () => {
      socket.off("user:joined", handleUserJoined);
      socket.off("incoming:call", handleIncomingCall);
      socket.off("call:accepted", handleCallAccepted);
    };
  }, [socket, handleUserJoined, handleIncomingCall, handleCallAccepted]);

  return (
    <div>
      <h1>Room Page</h1>
      <h4>{remoteSocketId ? "Connected" : "No one in room"}</h4>
      {remoteSocketId && <button onClick={handleCallUser}>Call</button>}
      {myStream && <p>Audio Call Active</p>}
    </div>
  );
};

export default RoomPage;
