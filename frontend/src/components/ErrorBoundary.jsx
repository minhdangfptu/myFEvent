// components/ErrorBoundary.jsx
import React from 'react';
import ErrorPage500 from '../pages/Errors/ErrorPage500'; 

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorPage500 />; 
    }

    return this.props.children;
  }
}

export default ErrorBoundary;