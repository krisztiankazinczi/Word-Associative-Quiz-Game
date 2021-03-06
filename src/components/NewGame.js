import React, { useState } from "react";
import withStyles from "@material-ui/core/styles/withStyles";

import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";

import { Redirect } from "react-router-dom";

import { useStateValue } from "../store/StateProvider";

import { newGame, setGameMode } from "../store/actions";
import Spinner from "./Spinner";

import axios from '../axios';

// needed to modify some Material UI css style
import './NewGame.css'

const styles = (theme) => ({
  ...theme.otherStyles,
  button: {
    ...theme.otherStyles.button,
    fontSize: "30px",
    padding: "10px 30px",
    borderRadius: "10px",
  },
  modeContainer: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    alignItems: "center",
    justifyContent: "center",
  },
  options: {
    display: "flex",
    width: "50%",
    alignItems: "center",
    "& > h2": {
      fontSize: "36px",
      color: theme.otherStyles.orangeColor.color,
      fontWeight: 700,
      flex: 0.5,
    },
  },
  dropDown: {
    fontSize: '26px',
    flex: 0.5,
    color: theme.otherStyles.orangeColor.color,
    "&:before": {
      borderColor: theme.otherStyles.orangeColor.color,
    },
    "&:after": {
      borderColor: theme.otherStyles.orangeColor.color,
    },
    "&:hover:not(.Mui-disabled):before": {
      borderColor: theme.otherStyles.orangeColor.color,
    },
  },
  '.MuiList-padding':{
    paddingTop: 0,
    paddingBottom: 0
  },
  icon: {
    fill: theme.otherStyles.orangeColor.color,
  },
  halfWidth: {
    width: "50%",
  },
  menuItem: {
    color: theme.otherStyles.orangeColor.color,
    backgroundColor: theme.otherStyles.secondaryBackgroundColor.backgroundColor,
    '&:hover': {
      background: theme.otherStyles.secondaryBackgroundColorHovered.backgroundColor,
    },
    '&.Mui-selected': {
      background: theme.otherStyles.secondaryBackgroundColor.backgroundColor,
    },
    '&.Mui-selected:hover': {
      background: theme.otherStyles.secondaryBackgroundColorHovered.backgroundColor,
    }
  },
});

function NewGame({ classes }) {
  const [area, setArea] = useState("sat");
  const [level, setLevel] = useState(5);
  const [timeLimit, setTimeLimit] = useState(30)
  const [redirectToQuiz, setRedirectToQuiz] = useState(false);
  const [mode, setMode] = useState(""); // single or multi
  const [redirectToRoom, setRedirectToRoom] = useState(false);
  const [roomID, setRoomID] = useState("");
  const [fetching, setFetching] = useState(false)

  const [{}, dispatch] = useStateValue();

  const categories = [
    "es",
    "ms",
    "hs",
    "ksat",
    "toeic",
    "toefl",
    "teps",
    "sat",
    "ielts",
    "gre",
    "gmat",
    "overall",
  ];

  const levels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  const times = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80, 90];

  const startSingleGame = async () => {
    //fetch data from server
    setFetching(true)
    try {
      const response = await axios.post("/newSingleGame", {
        area,
        level
      });
      const mode = {
        gameMode: response.data.gameMode,
        roomId: 'none'
      }
      //save data from back-end in the store
      dispatch(setGameMode(mode));
      dispatch(newGame(response.data.quizlist));
      setFetching(false)
      setRedirectToQuiz(true);
    } catch (error) {
      console.log(error)
      // Error handling
    }
  
  };

  const startMultiGame = async () => {
    // get roomID from back-end
    try {
      const response = await axios.get("/getRoomID");
      if (typeof response.data === "string") {
        setRoomID(response.data);
        setRedirectToRoom(true);
      }
    } catch (error) {
      console.log(error)
    }
  };

  const selectGameMode = (event) => {
    const gameMode = event.target.getAttribute("data-value");
    setMode(gameMode);
  };

    //show a spinner while data is fetching
    if (fetching) {
      return (
        <div className={classes.spinner}>
          <Spinner />
        </div>
      ) 
    }

  if (redirectToQuiz) {
    return (
      <Redirect
        to={{
          pathname: "/quiz",
        }}
      />
    );
  }

  if (redirectToRoom) {
    return (
      <Redirect
        to={{
          pathname: `/room/${roomID}`,
          state: { area, level, timeLimit },
        }}
      />
    );
  }

  if (!mode) {
    return (
      // first the player need to select the game mode. Once it does, this will disappear
      <div
        className={`${classes.modeContainer} ${classes.mainBackgroundColor}`}
      >
        <h2
          data-value="single"
          className={classes.button}
          onClick={(e) => selectGameMode(e)}
        >
          Single Player
        </h2>
        <h2
          data-value="multi"
          className={classes.button}
          onClick={(e) => selectGameMode(e)}
        >
          Multiplayer
        </h2>
      </div>
    );
  }

  return (
    // controlled select fields - to select the game options
    <div className={`${classes.modeContainer} ${classes.mainBackgroundColor}`}>
      <div className={classes.options}>
        <h2>Category</h2>
        <Select
          name="area"
          value={area}
          onChange={(e) => setArea(e.target.value)}
          className={classes.dropDown}
          inputProps={{classes: {
            icon: classes.icon
          }}}
        >
          {categories.map((cat) => (
            <MenuItem key={cat} className={classes.menuItem} value={cat}>
              {cat.toUpperCase()}
            </MenuItem>
          ))}
        </Select>
      </div>
      <div className={classes.options}>
        <h2>Level</h2>
        <Select
          name="level"
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className={classes.dropDown}
          inputProps={{classes: {
            icon: classes.icon
          }}}
        >
          {levels.map((level) => (
            <MenuItem key={level} className={classes.menuItem} value={level}>
              {level}
            </MenuItem>
          ))}
        </Select>
      </div>
      {/* timeLimit option available for multiplayer games only */}
      {mode === 'multi' && 
        <div className={classes.options}>
          <h2>Timelimit</h2>
          <Select
            name="timeLimit"
            value={timeLimit}
            onChange={(e) => setTimeLimit(e.target.value)}
            className={classes.dropDown}
            inputProps={{classes: {
              icon: classes.icon
            }}}
          >
            {times.map((t) => (
              <MenuItem key={t} className={classes.menuItem} value={t}>
                {t} s
              </MenuItem>
            ))}
          </Select>
        </div>
      }
  {/* this button will start the game (either multi or single) according to the previously selected mode option */}
      <Button
        size="large"
        className={`${classes.button} ${classes.halfWidth}`}
        variant="contained"
        onClick={
          mode === "single"
            ? startSingleGame
            : mode === "multi"
            ? startMultiGame
            : ""
        }
      >
        <Typography variant="h5">Start</Typography>
      </Button>
    </div>
  );
}

//connect to Material UI Theme Provider
export default withStyles(styles)(NewGame);
