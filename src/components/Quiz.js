import React, { useState, useEffect } from "react";
import withStyles from "@material-ui/core/styles/withStyles";
import Typography from "@material-ui/core/Typography";
import Button from "@material-ui/core/Button";

import { useStateValue } from "../store/StateProvider";
import { answerQuestion, saveEveryonesAnswers } from "../store/actions";
import { Redirect, Link } from "react-router-dom";

import socketIOClient from "socket.io-client";

import { collectAllAnswers } from "../store/selectors";

import Spinner from "./Spinner";

const styles = (theme) => ({
  ...theme.otherStyles,
  quiz: {
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.otherStyles.mainBackgroundColor.backgroundColor,
  },
  quizInfo: {
    textDecoration: "underline",
    color: theme.otherStyles.mainTextColor.color,
  },
  quizFinished: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    "& > a": {
      color: theme.otherStyles.orangeColor.color,
      backgroundColor:
        theme.otherStyles.secondaryBackgroundColor.backgroundColor,
      borderRadius: "5px",
      padding: "10px",
      fontSize: "40px",
      fontWeight: 700,
      textDecoration: "none",
    },
    "& > a:hover": {
      backgroundColor:
        theme.otherStyles.secondaryBackgroundColorHovered.backgroundColor,
    },
  },
  quizWords: {
    display: "flex",
    justifyContent: "space-evenly",
    "& > h3": {
      fontSize: "25px",
      color: theme.palette.primary.main,
    },
  },
  quizOptions: {
    display: "flex",
    justifyContent: "space-evenly",
    marginTop: "5vh",
    "& > h3": {
      padding: "10px",
      fontSize: "25px",
      borderRadius: "3px",
    },
    "& h3:not(:first-child)": {
      marginLeft: "5%",
    },
  },
  quizQuestionNumber: {
    color: theme.otherStyles.orangeColor.color,
    fontWeight: 500,
  },
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    "& > h3": {
      fontSize: "25px",
      fontWeight: 500,
      marginTop: "25px",
      color: theme.otherStyles.mainTextColor.color,
    },
    "& > h3:first-child": {
      color: theme.otherStyles.orangeColor.color,
    },
  },
  button: {
    ...theme.otherStyles.button,
    fontSize: "25px",
    padding: "10px",
    borderRadius: "3px",
    textTransform: "capitalized",
  },
  countDown: {
    color: theme.otherStyles.orangeColor.color,
  },
  info: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
});

const countDownInitialValue = (currentGameMode) => {
  if (currentGameMode.createdAt) {
    //the logic to get the exact selected timelimit (because of the countDown on WaitingRoom we had an extra 4 sec waiting time)
    const now = Date.now();
    const createdAtconverted = new Date(currentGameMode.createdAt);
    const countDownDifference =
      currentGameMode.timeLimitWithWaitingTime - currentGameMode.timeLimit;
    const gameEnd =
      createdAtconverted.getTime() +
      (currentGameMode.timeLimit + countDownDifference) * 1000;
    // I use Math.floor because the server will collect the answers when the timelimit expires, so this Math.floor provides
    // that the player's timer will expire a little bit sooner than the limit on the server
    const remainingTime = Math.floor((gameEnd - now) / 1000);
    return remainingTime;
  }
  return null;
};

const ENDPOINT = process.env.REACT_APP_DEVELOPMENT_MODE === 'true' ? 'http://localhost:3030' : process.env.REACT_APP_BACK_END_URL;

const Quiz = ({ classes }) => {
  const [
    { quiz, currentQuestion, currentGameMode, username },
    dispatch,
  ] = useStateValue();

  const [finished, setFinished] = useState(false); // finished game in SinglePLayer mode or finished my game in multiPlayer mode
  const [multiFinished, setMultiFinished] = useState(false); // when server informs us, that everyone finished the game or the time limit passed
  const [submittedAnswers, setSubmittedAnswers] = useState(false);
  // I need countDown functionality only in multiPlayer mode => a function calculate the timelimit or if it's sinlePlayer, then set the value to null
  const [countDown, setCountDown] = useState(
    countDownInitialValue(currentGameMode)
  );
  const [redirectToResults, setRedirectToResults] = useState(false);

  useEffect(() => {
    if (currentGameMode.gameMode === "singlePlayer") return;
    // countDown starts at the first load
    const interval = setInterval(() => {
      setCountDown((countDown) => countDown - 1);
    }, 1000);

    const socket = socketIOClient(ENDPOINT);

    socket.emit("join-room", currentGameMode.roomId, username);
    // listens to quiz-finished, which will triggered when everyone finished the game or the timeLimit expired
    socket.on("quiz-finished", (gameResult) => {
      dispatch(saveEveryonesAnswers(gameResult));
      setMultiFinished(true);
      setRedirectToResults(true);
    });

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (currentGameMode.gameMode === "singlePlayer") return;
    // submit all the answers what have if the timeLimit expires
    if (countDown === 0) {
      const socket = socketIOClient(ENDPOINT);

      // socket.emit("join-room", currentGameMode.roomId, username);

      const myAnswers = collectAllAnswers(quiz.quizQuestions);
      socket.emit(
        "submit-answers",
        currentGameMode.roomId,
        username,
        myAnswers
      );
      setSubmittedAnswers(true);

      return () => socket.disconnect();
    }
  }, [countDown]);

  //function change the state in the store when a question is answered
  const selectAnswer = (event) => {
    const questionNumber = parseInt(
      event.target.getAttribute("data-question-number")
    );
    const answer = parseInt(event.target.getAttribute("data-answer"));
    dispatch(answerQuestion({ questionNumber, answer }));

    if (currentQuestion === 9) {
      setFinished(true);
      return;
    }
  };

  // redirect if the user comes to this page without starting a newGame or did not have a saved game
  if (!quiz.quizQuestions && !username && !currentGameMode.gameMode) {
    return <Redirect to="/" />;
  }

  // if (redirectToResults) {
  //   return <Redirect to="/result" />;
  // }

  // this also submit all the answers to the server if the player press this button (it's possible only if every question is answered)
  const submitAnswersToServer = () => {
    const myAnswers = collectAllAnswers(quiz.quizQuestions);
    const socket = socketIOClient(ENDPOINT);
    socket.emit("submit-answers", currentGameMode.roomId, username, myAnswers);
    setSubmittedAnswers(true);
  };

  return (
    <div className={classes.quiz}>
      <div className={classes.halfWidth}>
        {/* if either single or multi game is finished, this will be rendered */}
        {(finished && currentGameMode.gameMode === "singlePlayer") ||
        multiFinished ? (
          <div className={classes.quizFinished}>
            <Link to="/result">Check Result</Link>
          </div>
        ) : finished && currentGameMode.gameMode === "multiPlayer" ? (
          // if multiPlayer game finished this will be rendered
          <div className={classes.container}>
            {/* if the player submit the answers to server, than the button will disappear and a text will appear */}
            {!submittedAnswers ? (
              <Button
                variant="contained"
                className={classes.button}
                onClick={submitAnswersToServer}
              >
                Send
              </Button>
            ) : (
              <h3>Answers sent to server</h3>
            )}
            {/* Spinner until the every player finish the game or the timelimit expires */}
            <h3>Waiting for other players....</h3>
            <Spinner />
          </div>
        ) : (
          // Quiz Questions/Answers display one by one
          <div>
            <div className={classes.info}>
              <Typography variant="h3" className={classes.quizQuestionNumber}>
                {currentQuestion + 1} / 10
              </Typography>
              {currentGameMode.gameMode === "multiPlayer" && (
                <Typography variant="h3" className={classes.countDown}>
                  {countDown} s
                </Typography>
              )}
            </div>
            <h3 className={classes.quizInfo}>
              Select the most related word to the first 3 ones!
            </h3>

            <div className={classes.quizWords}>
              {quiz
                .quizQuestions[currentQuestion]
                .quiz.map((word, idx) => (
                <h3 key={idx}>{word}</h3>
              ))}
            </div>
            <div className={classes.quizOptions}>
              {quiz.quizQuestions[currentQuestion].option.map((option, idx) => (
                <button
                  className={classes.button}
                  key={idx}
                  data-question-number={currentQuestion}
                  data-answer={idx + 1}
                  onClick={(e) => selectAnswer(e)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

//connect to Material UI Theme Provider
export default withStyles(styles)(Quiz);
