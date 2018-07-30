import React, { Component } from 'react';
import { BrowserRouter as Router, Link } from 'react-router-dom';
import { Provider } from 'react-redux';
import MeasureWindow from 'payload/client/components/utilities/MeasureWindow';
import MeasureScroll from 'payload/client/components/utilities/MeasureScroll';
import Routes from './Routes';
import store from 'payload/client/store';

import 'payload/client/scss/app.css';

class App extends Component {
  render() {
    return (
      <Provider store={store}>
        <Router>
          <React.Fragment>
            <MeasureScroll />
            <MeasureWindow />
            <Routes />
            <Link to="/">Dashboard</Link>
          </React.Fragment>
        </Router>
      </Provider>
    );
  }
}

export default App;