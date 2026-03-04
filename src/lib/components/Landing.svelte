<div class="container landing-container">
  <div class="landing-content">
    <h1>UAT Feedback Board</h1>
    <p class="subtitle">Track user acceptance testing feedback and development tasks</p>
    
    <div class="features">
      <div class="feature">
        <h3>For Customers</h3>
        <p>Submit feedback, report issues, and request features during your UAT period. Track the progress of your submissions in real-time.</p>
      </div>
      
      <div class="feature">
        <h3>For Teams</h3>
        <p>Manage customer feedback, assign tasks, and collaborate on resolving issues. Keep customers informed with status updates.</p>
      </div>
    </div>
    
    <div class="cta">
      <p>Ready to get started? Click the <strong>Login</strong> button above to access your board.</p>
    </div>
  </div>
</div>

<style>
  .landing-container {
    display: flex;
    justify-content: center;
    flex: 1;
    padding: 2rem;
  }
  
  .landing-content {
    max-width: 800px;
    text-align: center;
    margin: 0 auto;
  }
  
  h1 {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
    color: var(--fg-1);
  }
  
  .subtitle {
    font-size: 1.25rem;
    color: var(--fg-2);
    margin-bottom: 3rem;
  }
  
  .features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    margin-bottom: 3rem;
    text-align: left;
  }
  
  .feature {
    padding: 1.5rem;
    background: var(--bg-2);
    border-radius: 8px;
    border: 1px solid var(--border);
  }
  
  .feature h3 {
    font-size: 1.25rem;
    margin-bottom: 0.75rem;
    color: var(--fg-1);
  }
  
  .feature p {
    color: var(--fg-2);
    line-height: 1.6;
  }
  
  .cta {
    padding: 1.5rem;
    background: var(--bg-2);
    border-radius: 8px;
    border: 1px solid var(--border);
  }
  
  .cta p {
    margin: 0;
    color: var(--fg-2);
    font-size: 1.125rem;
  }
  
  @media (max-width: 768px) {
    h1 {
      font-size: 2rem;
    }
    
    .subtitle {
      font-size: 1.125rem;
    }
    
    .features {
      grid-template-columns: 1fr;
    }
  }
</style>
