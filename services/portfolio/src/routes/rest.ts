import express from 'express';
import { requestCounter, errorCounter, latencyHistogram } from '../middleware/metrics';
import { getPortfolios, createPortfolio, getPortfolio, updatePortfolio, deletePortfolio } from '../controllers/portfolioController';
const router = express.Router();

router.get('/portfolios', (req, res) => {
  const end = latencyHistogram.startTimer();
  try {
    const result = getPortfolios();
    requestCounter.inc({ method: 'GET', route: '/portfolios', status: 200 });
    res.json(result);
  } catch (err) {
    errorCounter.inc({ method: 'GET', route: '/portfolios', status: 500 });
    res.status(500).json({ error: 'Internal error' });
  } finally {
    end({ method: 'GET', route: '/portfolios', status: res.statusCode });
  }
});

router.post('/portfolios', (req, res) => {
  const end = latencyHistogram.startTimer();
  try {
    const result = createPortfolio(req.body);
    requestCounter.inc({ method: 'POST', route: '/portfolios', status: 201 });
    res.status(201).json(result);
  } catch (err) {
    errorCounter.inc({ method: 'POST', route: '/portfolios', status: 500 });
    res.status(500).json({ error: 'Internal error' });
  } finally {
    end({ method: 'POST', route: '/portfolios', status: res.statusCode });
  }
});

router.get('/portfolios/:id', (req, res) => {
  const end = latencyHistogram.startTimer();
  try {
    const result = getPortfolio(req.params.id);
    if (!result) {
      errorCounter.inc({ method: 'GET', route: '/portfolios/:id', status: 404 });
      return res.status(404).json({ error: 'Not found' });
    }
    requestCounter.inc({ method: 'GET', route: '/portfolios/:id', status: 200 });
    res.json(result);
  } catch (err) {
    errorCounter.inc({ method: 'GET', route: '/portfolios/:id', status: 500 });
    res.status(500).json({ error: 'Internal error' });
  } finally {
    end({ method: 'GET', route: '/portfolios/:id', status: res.statusCode });
  }
});

router.put('/portfolios/:id', (req, res) => {
  const end = latencyHistogram.startTimer();
  try {
    const result = updatePortfolio(req.params.id, req.body);
    requestCounter.inc({ method: 'PUT', route: '/portfolios/:id', status: 200 });
    res.json(result);
  } catch (err) {
    errorCounter.inc({ method: 'PUT', route: '/portfolios/:id', status: 500 });
    res.status(500).json({ error: 'Internal error' });
  } finally {
    end({ method: 'PUT', route: '/portfolios/:id', status: res.statusCode });
  }
});

router.delete('/portfolios/:id', (req, res) => {
  const end = latencyHistogram.startTimer();
  try {
    const result = deletePortfolio(req.params.id);
    requestCounter.inc({ method: 'DELETE', route: '/portfolios/:id', status: 204 });
    res.status(204).json(result);
  } catch (err) {
    errorCounter.inc({ method: 'DELETE', route: '/portfolios/:id', status: 500 });
    res.status(500).json({ error: 'Internal error' });
  } finally {
    end({ method: 'DELETE', route: '/portfolios/:id', status: res.statusCode });
  }
});

export default router; 