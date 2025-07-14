import { Router } from "express";

const router = Router();

router.get('/detail', (req, res)=> {
    res.json({
        message: 'detail data'
    })
})


router.post('/', (req, res)=> {
    res.json({
        message: 'Hello! This is post method'
    })
})

router.get('/', (req, res)=> {
    res.json({
        message: 'Hello Express!!'
    })
})

export default router