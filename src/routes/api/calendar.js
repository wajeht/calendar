import express from 'express';

export function createCalendarRouter(ctx) {
    const router = express.Router();

    router.get('/', (_req, res) => {
        const todos = ctx.db.todo.getAll();
        res.json({ success: true, data: todos });
    });

    router.get('/:id', (req, res) => {
        const todo = ctx.db.todo.getById(req.params.id);
        if (!todo) {
            return res.status(404).json({ success: false, error: 'Todo not found' });
        }
        res.json({ success: true, data: todo });
    });

    router.post('/', (req, res) => {
        const { title } = req.body;
        if (!title) {
            return res.status(400).json({ success: false, error: 'Title is required' });
        }

        const todo = ctx.db.todo.create({ id: Date.now(), title });
        ctx.logger.info(`Todo created: ${todo.title}`);

        ctx.jobs.notifications.todoCreated(todo);

        res.status(201).json({ success: true, data: todo });
    });

    router.patch('/:id', (req, res) => {
        const todo = ctx.db.todo.getById(req.params.id);
        if (!todo) {
            return res.status(404).json({ success: false, error: 'Todo not found' });
        }

        const updatedTodo = ctx.db.todo.update(req.params.id, req.body);
        ctx.logger.info(`Todo updated: ${updatedTodo.title}`);

        ctx.jobs.notifications.todoUpdated(updatedTodo);

        res.json({ success: true, data: updatedTodo });
    });

    router.delete('/:id', (req, res) => {
        const todo = ctx.db.todo.delete(req.params.id);
        if (!todo) {
            return res.status(404).json({ success: false, error: 'Todo not found' });
        }

        ctx.logger.info(`Todo deleted: ${todo.title}`);

        ctx.jobs.notifications.todoDeleted(todo);

        res.json({ success: true, data: todo });
    });

    return router;
}

