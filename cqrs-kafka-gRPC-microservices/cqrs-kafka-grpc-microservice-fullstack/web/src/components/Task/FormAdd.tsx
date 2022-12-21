import { useState, FormEvent } from 'react';
import { Button, HStack, Input, useToast } from "@chakra-ui/react";
import { addTask } from '../../slices/TaskSlice';
import { useDispatch } from 'react-redux';

function FormAdd() {
    const toast = useToast();
    const dispatch = useDispatch();
    const [content, setContent] = useState('');
    const [statusInput, setStatusInput] = useState(true);

    function handleSubmit(e: FormEvent<HTMLFormElement>){
        e.preventDefault();

        const taskText = content.trim();

        if (!taskText) {
            toast({
                title: 'Digite sua tarefa',
                position: 'top',
                status: 'warning',
                duration: 2000,
                isClosable: true,
            });
            setStatusInput(false);
            
            return setContent('');
        }

        dispatch(addTask(taskText));
        setContent('');
    }

    if (content && !statusInput) {
        setStatusInput(true);
    }

    return (
        <form onSubmit={handleSubmit}>
            <HStack mt='4' mb='4'>
                <Input
                    h='46'
                    borderColor={!statusInput ? 'red.300' : 'transparent'}
                    variant='filled'
                    placeholder='Digite sua tarefa'
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                />
                <Button
                colorScheme='blue'
                px='8'
                pl='10'
                pr='10'
                h='46' 
                type='submit'>Adicionar</Button>
            </HStack>
        </form>
    );
}

export default FormAdd;