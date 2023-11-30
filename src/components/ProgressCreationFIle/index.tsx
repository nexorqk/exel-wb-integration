import { Box, LinearProgress } from '@mui/material';

interface Props {
    statusText: string;
}

const ProgressCreationFIle = ({ statusText }: Props) => {
    return (
        <div className="generate-file-container">
            <p className="generate-file-text">{statusText}.....</p>
            <Box sx={{ width: '100%' }}>
                <LinearProgress />
            </Box>
        </div>
    );
};

export default ProgressCreationFIle;
